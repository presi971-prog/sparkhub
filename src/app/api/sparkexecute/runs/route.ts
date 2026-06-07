/**
 * Routes SparkExecute — création et listing de runs.
 *
 *   POST /api/sparkexecute/runs → crée un run (déclenche la génération en arrière-plan)
 *   GET  /api/sparkexecute/runs → liste les runs de l'utilisateur (filtres possibles)
 */

import { NextResponse, after } from 'next/server'
import * as Sentry from '@sentry/nextjs'

import { createClient } from '@/lib/supabase/server'
import { executeRun } from '@/lib/sparkexecute/orchestrate'
import { RUN_TYPE_AVAILABLE_V1, deduceTypeFromFramework } from '@/lib/sparkexecute/type-mapping'
import type {
  RunInputBrief,
  RunStatus,
  RunType,
  SparkexecuteRun,
} from '@/lib/sparkexecute/types'
import type { SparkpilotTask } from '@/lib/sparkpilot/types'

// Marge confortable : Claude/images ~30-50 s, mais la VIDÉO (Veo) peut prendre
// jusqu'à 2-3 min → 300 s (max plan Vercel Pro). En dev local, aucune limite.
export const maxDuration = 300

const VALID_TYPES: RunType[] = [
  'article_seo',
  'article_long',
  'article_court',
  'faq',
  'post_linkedin',
  'post_instagram',
  'hooks_pub',
  'visual',
  'carousel',
  'video',
  'page_accueil',
  'schema_markup',
]

const VALID_STATUSES: RunStatus[] = [
  'generating',
  'draft',
  'validated',
  'published',
  'archived',
  'failed',
]

interface CreateRunPayload {
  task_id?: string
  type?: RunType
  input_brief?: RunInputBrief
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  let payload: CreateRunPayload
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  // Si on a une task_id : on hydrate le brief depuis la tâche SparkPilot.
  let task: SparkpilotTask | null = null
  if (payload.task_id) {
    const { data: taskRow, error: taskError } = await supabase
      .from('sparkpilot_tasks')
      .select(
        'id, plan_id, priority_index, title, description, due_date, estimated_duration_minutes, status, completed_at, order_index, metadata, created_at',
      )
      .eq('id', payload.task_id)
      .maybeSingle<SparkpilotTask>()

    if (taskError) {
      return NextResponse.json(
        { error: `Tâche introuvable : ${taskError.message}` },
        { status: 400 },
      )
    }
    if (!taskRow) {
      return NextResponse.json(
        { error: 'Tâche introuvable ou non autorisée' },
        { status: 404 },
      )
    }
    task = taskRow

    // Idempotence : si on a déjà créé un run pour cette tâche, on renvoie l'id existant.
    // Ça permet au bouton "Faire avec SparkExecute" d'être cliqué N fois sans
    // multiplier les drafts.
    const { data: existingRun } = await supabase
      .from('sparkexecute_runs')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('task_id', payload.task_id)
      .not('status', 'eq', 'archived')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string; status: RunStatus }>()

    if (existingRun) {
      return NextResponse.json(
        {
          run_id: existingRun.id,
          status: existingRun.status,
          existing: true,
        },
        { status: 200 },
      )
    }
  }

  // Détermine le type final : explicite > déduit du framework > fallback article_seo.
  const type: RunType =
    payload.type && VALID_TYPES.includes(payload.type)
      ? payload.type
      : deduceTypeFromFramework(task?.metadata?.framework_used, task?.title)

  if (!RUN_TYPE_AVAILABLE_V1[type]) {
    return NextResponse.json(
      {
        error: `Le type "${type}" arrive bientôt. Pour le moment, choisis : article SEO, post LinkedIn, post Instagram ou visuel.`,
      },
      { status: 400 },
    )
  }

  // Brief : merge entre ce que l'user fournit et ce qu'on extrait de la tâche.
  // Pour aspect_ratio, on whiteliste les valeurs ('1:1' | '4:5') et on applique
  // un défaut par type (4:5 pour Instagram, 1:1 sinon) si l'user ne précise rien.
  const rawAspectRatio = payload.input_brief?.aspect_ratio
  const allowedRatios: Array<'1:1' | '4:5'> = ['1:1', '4:5']
  const aspectRatio: '1:1' | '4:5' | undefined =
    rawAspectRatio && allowedRatios.includes(rawAspectRatio)
      ? rawAspectRatio
      : type === 'post_instagram'
        ? '4:5'
        : type === 'visual' || type === 'post_linkedin'
          ? '1:1'
          : undefined

  const inputBrief: RunInputBrief = {
    sujet: payload.input_brief?.sujet?.trim() || task?.title || 'Sans sujet',
    audience: payload.input_brief?.audience,
    ton: payload.input_brief?.ton,
    mots_cles: payload.input_brief?.mots_cles,
    longueur_souhaitee: payload.input_brief?.longueur_souhaitee,
    framework_override: payload.input_brief?.framework_override,
    variant: payload.input_brief?.variant,
    aspect_ratio: aspectRatio,
  }

  if (!inputBrief.sujet || inputBrief.sujet === 'Sans sujet') {
    return NextResponse.json(
      { error: 'Le champ "sujet" est requis dans le brief.' },
      { status: 400 },
    )
  }

  // Insert du run en 'generating'.
  const { data: inserted, error: insertError } = await supabase
    .from('sparkexecute_runs')
    .insert({
      user_id: user.id,
      task_id: payload.task_id ?? null,
      type,
      framework_used: task?.metadata?.framework_used ?? null,
      input_brief: inputBrief,
      output: {},
      status: 'generating' as RunStatus,
      metadata: {},
    })
    .select('id')
    .single<{ id: string }>()

  if (insertError || !inserted) {
    Sentry.captureException(insertError, {
      tags: { feature: 'sparkexecute', step: 'run-create' },
    })
    return NextResponse.json(
      { error: insertError?.message ?? 'Création du run échouée' },
      { status: 500 },
    )
  }

  const runId = inserted.id

  // Lance l'exécution en arrière-plan via after() : le travail continue APRÈS
  // l'envoi de la réponse, dans la durée de vie de la fonction (jusqu'à
  // maxDuration), au lieu d'être coupé immédiatement par l'hébergeur.
  // Le client poll /api/sparkexecute/runs/[id] pour suivre le statut ; si le
  // run reste bloqué en 'generating' trop longtemps, le GET l'auto-répare.
  after(() => {
    return executeRun(runId).catch((err) => {
      Sentry.captureException(err, {
        tags: { feature: 'sparkexecute', step: 'run-execute-bg' },
        extra: { runId },
      })
      console.error(`[SparkExecute] background execute failed for ${runId}:`, err)
    })
  })

  return NextResponse.json(
    {
      run_id: runId,
      status: 'generating',
    },
    { status: 201 },
  )
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const url = new URL(req.url)
  const statusFilter = url.searchParams.get('status')
  const typeFilter = url.searchParams.get('type')
  const limitParam = Number.parseInt(url.searchParams.get('limit') ?? '50', 10)
  const limit = Number.isFinite(limitParam)
    ? Math.min(200, Math.max(1, limitParam))
    : 50

  let query = supabase
    .from('sparkexecute_runs')
    .select(
      'id, user_id, task_id, type, framework_used, input_brief, output, status, cost_usd, tokens_input, tokens_output, error_message, metadata, created_at, validated_at, published_at, updated_at',
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (statusFilter && VALID_STATUSES.includes(statusFilter as RunStatus)) {
    query = query.eq('status', statusFilter)
  }
  if (typeFilter && VALID_TYPES.includes(typeFilter as RunType)) {
    query = query.eq('type', typeFilter)
  }

  const { data, error } = await query

  if (error) {
    Sentry.captureException(error, {
      tags: { feature: 'sparkexecute', step: 'runs-list' },
    })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ runs: (data ?? []) as SparkexecuteRun[] })
}
