/**
 * Route SparkExecute — relancer une génération avec un twist.
 *
 *   POST /api/sparkexecute/runs/[id]/redo
 *   Body: { variant?: 'shorter'|'punchier'|'pro'|'casual', framework_override?: string }
 *
 * Comportement : crée un NOUVEAU run (jamais on n'écrase le précédent) avec le
 * même type / brief, en injectant la variante ou le framework alternatif dans
 * le brief. On garde l'ancien run intact pour que l'user puisse comparer.
 *
 * Le nouveau run hérite du task_id de l'ancien (lien SparkPilot conservé).
 */

import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

import { createClient } from '@/lib/supabase/server'
import { executeRun } from '@/lib/sparkexecute/orchestrate'
import type {
  RunInputBrief,
  RunStatus,
  SparkexecuteRun,
} from '@/lib/sparkexecute/types'

export const maxDuration = 120

interface RouteContext {
  params: Promise<{ id: string }>
}

interface RedoPayload {
  variant?: RunInputBrief['variant']
  framework_override?: string
}

const VALID_VARIANTS: RunInputBrief['variant'][] = [
  'shorter',
  'punchier',
  'pro',
  'casual',
]

export async function POST(req: Request, context: RouteContext) {
  const { id } = await context.params
  if (!id) {
    return NextResponse.json({ error: 'ID manquant' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  let payload: RedoPayload = {}
  try {
    payload = await req.json()
  } catch {
    // Body optionnel — pas grave si vide.
  }

  // Valide la variante si fournie.
  if (payload.variant && !VALID_VARIANTS.includes(payload.variant)) {
    return NextResponse.json(
      {
        error: `Variante invalide. Autorisées : ${VALID_VARIANTS.join(', ')}`,
      },
      { status: 400 },
    )
  }

  // Charge le run d'origine.
  const { data: source, error: loadError } = await supabase
    .from('sparkexecute_runs')
    .select(
      'id, user_id, task_id, type, framework_used, input_brief, output, status, cost_usd, tokens_input, tokens_output, error_message, metadata, created_at, validated_at, published_at, updated_at',
    )
    .eq('id', id)
    .maybeSingle<SparkexecuteRun>()

  if (loadError) {
    return NextResponse.json({ error: loadError.message }, { status: 500 })
  }
  if (!source) {
    return NextResponse.json({ error: 'Run introuvable' }, { status: 404 })
  }

  // Empêche de relancer un run en cours de génération.
  if (source.status === 'generating') {
    return NextResponse.json(
      {
        error: "Ce run est encore en cours de génération. Attends qu'il soit prêt.",
      },
      { status: 409 },
    )
  }

  // Construit le nouveau brief enrichi.
  const newBrief: RunInputBrief = {
    ...source.input_brief,
    variant: payload.variant ?? source.input_brief.variant,
    framework_override:
      payload.framework_override?.trim() || source.input_brief.framework_override,
  }

  // Insert le nouveau run.
  const { data: inserted, error: insertError } = await supabase
    .from('sparkexecute_runs')
    .insert({
      user_id: user.id,
      task_id: source.task_id,
      type: source.type,
      framework_used: payload.framework_override ?? source.framework_used,
      input_brief: newBrief,
      output: {},
      status: 'generating' as RunStatus,
      metadata: {
        redo_of: source.id,
      },
    })
    .select('id')
    .single<{ id: string }>()

  if (insertError || !inserted) {
    Sentry.captureException(insertError, {
      tags: { feature: 'sparkexecute', step: 'run-redo' },
    })
    return NextResponse.json(
      { error: insertError?.message ?? 'Création du nouveau run échouée' },
      { status: 500 },
    )
  }

  const newRunId = inserted.id

  // Fire-and-forget : lance la nouvelle génération.
  void executeRun(newRunId).catch((err) => {
    Sentry.captureException(err, {
      tags: { feature: 'sparkexecute', step: 'run-redo-bg' },
      extra: { newRunId, sourceId: source.id },
    })
    console.error(`[SparkExecute] redo background failed for ${newRunId}:`, err)
  })

  return NextResponse.json(
    {
      run_id: newRunId,
      status: 'generating',
      redo_of: source.id,
    },
    { status: 201 },
  )
}
