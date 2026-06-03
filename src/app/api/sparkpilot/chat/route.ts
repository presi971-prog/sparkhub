/**
 * POST /api/sparkpilot/chat
 *
 * Coach SparkPilot — endpoint streaming SSE.
 *
 * Payload :
 *   {
 *     session_id?: string,
 *     message: string,
 *     context: {
 *       page: 'dashboard' | 'plan' | 'task' | 'calendrier' | 'frameworks',
 *       plan_id?: string,
 *       task_id?: string,
 *       page_url?: string
 *     }
 *   }
 *
 * Flow :
 *   1. Auth (RLS Supabase).
 *   2. Vérif quota : 20 messages/jour MAX (sparkpilot_chat_usage).
 *   3. Charge ou crée la session (sparkpilot_chat_sessions).
 *   4. Récupère le contexte enrichi (profil user, plan, tâche, scan source).
 *   5. Build system prompt (lib/sparkpilot/chat/system-prompt.ts).
 *   6. Stream Claude → SSE vers le client (events: meta, delta, done, error).
 *   7. À la fin du stream : append messages dans le jsonb + upsert usage.
 *
 * Réponses :
 *   - 200 + flux SSE : nominal.
 *   - 401 : non authentifié.
 *   - 400 : payload invalide.
 *   - 429 : quota dépassé (20 messages/jour).
 *   - 500 : erreur serveur (Claude down, BDD KO).
 */

import * as Sentry from '@sentry/nextjs'

import { createClient } from '@/lib/supabase/server'
import {
  streamClaudeChat,
  type ChatMessage,
  type ClaudeStreamUsage,
} from '@/lib/sparkpilot/chat/claude-stream'
import {
  buildSystemPrompt,
  type ChatBuildContext,
  type ChatPageContext,
  type PlanStats,
} from '@/lib/sparkpilot/chat/system-prompt'
import type { SparkpilotPlan, SparkpilotTask } from '@/lib/sparkpilot/types'

/** Limite hard par défaut V2 : protège la facture Anthropic. */
const DAILY_MESSAGE_LIMIT = 20

/** Garde-fou : 4000 caractères = ~1000 tokens, largement suffisant. */
const MAX_USER_MESSAGE_LENGTH = 4000

/** Max tokens de la réponse coach (Sonnet 4.6). */
const MAX_RESPONSE_TOKENS = 1024

// La route stream donc on a besoin d'un Node runtime (pas Edge — moins de
// compat avec ReadableStream Anthropic) et d'une duration confortable.
export const runtime = 'nodejs'
export const maxDuration = 90

/** Pages valides pour le contexte. */
const VALID_PAGES: ChatPageContext[] = [
  'dashboard',
  'plan',
  'task',
  'calendrier',
  'frameworks',
  'unknown',
]

interface ChatPayload {
  session_id?: string
  message?: string
  context?: {
    page?: string
    plan_id?: string
    task_id?: string
    page_url?: string
  }
}

interface ProfileRow {
  id: string
  full_name: string | null
  email: string | null
}

interface ScanSnapshotRow {
  id: string
  input_url: string | null
  zone: string | null
  synthesis: { executive_summary?: string } | null
}

export async function POST(req: Request): Promise<Response> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return jsonError('Non authentifié', 401)
  }

  let body: ChatPayload
  try {
    body = (await req.json()) as ChatPayload
  } catch {
    return jsonError('JSON invalide', 400)
  }

  const userMessage = body.message?.trim()
  if (!userMessage) {
    return jsonError('Champ requis : message', 400)
  }
  if (userMessage.length > MAX_USER_MESSAGE_LENGTH) {
    return jsonError(
      `Message trop long (max ${MAX_USER_MESSAGE_LENGTH} caractères).`,
      400,
    )
  }

  const requestedPage = (body.context?.page ?? 'unknown').toLowerCase()
  const page: ChatPageContext = (VALID_PAGES as string[]).includes(requestedPage)
    ? (requestedPage as ChatPageContext)
    : 'unknown'
  const planId = body.context?.plan_id?.trim() || null
  const taskId = body.context?.task_id?.trim() || null
  const pageUrl = body.context?.page_url?.trim() || undefined

  // ─── Quota check ──────────────────────────────────────────────────
  const today = todayUtc()
  const { data: usageRow } = await supabase
    .from('sparkpilot_chat_usage')
    .select('messages_count')
    .eq('user_id', user.id)
    .eq('day', today)
    .maybeSingle<{ messages_count: number }>()

  const currentCount = usageRow?.messages_count ?? 0
  if (currentCount >= DAILY_MESSAGE_LIMIT) {
    return jsonError(
      `Tu as atteint la limite de ${DAILY_MESSAGE_LIMIT} questions par jour. Reviens demain — d'ici là, jette un œil au glossaire des frameworks pour continuer à apprendre !`,
      429,
    )
  }

  // ─── Charge ou crée la session ────────────────────────────────────
  let sessionId = body.session_id?.trim() || null
  let previousMessages: ChatMessage[] = []

  if (sessionId) {
    const { data: sessionRow } = await supabase
      .from('sparkpilot_chat_sessions')
      .select('id, messages')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .maybeSingle<{ id: string; messages: ChatMessage[] | null }>()
    if (!sessionRow) {
      // Session inconnue / non autorisée → on en crée une nouvelle
      // plutôt que d'erreur (UX plus douce).
      sessionId = null
    } else {
      previousMessages = Array.isArray(sessionRow.messages)
        ? sessionRow.messages
        : []
    }
  }

  if (!sessionId) {
    const { data: created, error: createErr } = await supabase
      .from('sparkpilot_chat_sessions')
      .insert({
        user_id: user.id,
        plan_id: planId,
        task_id: taskId,
        context_url: pageUrl ?? null,
        messages: [],
      })
      .select('id')
      .single<{ id: string }>()
    if (createErr || !created) {
      Sentry.captureException(createErr, {
        tags: { feature: 'sparkpilot-chat', step: 'session-create' },
      })
      return jsonError('Création de la session impossible', 500)
    }
    sessionId = created.id
  }

  // ─── Récupération du contexte enrichi ─────────────────────────────
  const ctx = await loadContext(supabase, user.id, page, planId, taskId, pageUrl)

  // ─── Build system prompt + messages history ───────────────────────
  let systemPrompt: string
  try {
    systemPrompt = await buildSystemPrompt(ctx)
  } catch (err) {
    Sentry.captureException(err, {
      tags: { feature: 'sparkpilot-chat', step: 'system-prompt' },
    })
    return jsonError('Erreur de construction du prompt', 500)
  }

  const newUserMessage: ChatMessage = {
    role: 'user',
    content: userMessage,
    created_at: new Date().toISOString(),
  }
  // On garde max les 20 derniers messages pour éviter une explosion
  // de tokens si la session devient longue.
  const trimmedHistory = previousMessages.slice(-20)
  const messagesForClaude: ChatMessage[] = [
    ...trimmedHistory,
    newUserMessage,
  ]

  // ─── Stream Claude → SSE ──────────────────────────────────────────
  const encoder = new TextEncoder()
  const finalSessionId = sessionId

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: Record<string, unknown>) => {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(payload))
      }

      // 1. Envoie un event "meta" tout de suite (session_id, quota).
      send('meta', {
        session_id: finalSessionId,
        messages_remaining: DAILY_MESSAGE_LIMIT - currentCount - 1,
      })

      let assistantFullText = ''
      let assistantUsage: ClaudeStreamUsage | null = null
      let streamError: string | null = null

      try {
        for await (const ev of streamClaudeChat({
          systemPrompt,
          messages: messagesForClaude,
          maxTokens: MAX_RESPONSE_TOKENS,
          label: 'sparkpilot-chat',
        })) {
          if (ev.type === 'delta') {
            send('delta', { text: ev.text })
          } else if (ev.type === 'done') {
            assistantFullText = ev.fullText
            assistantUsage = ev.usage
          } else if (ev.type === 'error') {
            streamError = ev.error
            send('error', { error: ev.error })
            break
          }
        }
      } catch (err) {
        streamError = err instanceof Error ? err.message : String(err)
        Sentry.captureException(err, {
          tags: { feature: 'sparkpilot-chat', step: 'stream' },
        })
        send('error', { error: streamError })
      }

      // 2. Persiste la conversation + l'usage (best-effort).
      //    Important : on persiste MÊME si Claude n'a rien renvoyé, pour
      //    que le user voie son propre message dans l'historique au reload.
      try {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: assistantFullText || '(réponse interrompue — réessaie)',
          created_at: new Date().toISOString(),
        }
        const updatedMessages: ChatMessage[] = [
          ...previousMessages,
          newUserMessage,
          assistantMessage,
        ]
        await supabase
          .from('sparkpilot_chat_sessions')
          .update({
            messages: updatedMessages,
            // On met à jour le contexte courant (peut avoir changé si
            // l'user a navigué entre 2 messages dans la même session).
            plan_id: planId,
            task_id: taskId,
            context_url: pageUrl ?? null,
          })
          .eq('id', finalSessionId)
          .eq('user_id', user.id)
      } catch (err) {
        Sentry.captureException(err, {
          tags: { feature: 'sparkpilot-chat', step: 'session-persist' },
        })
      }

      // 3. Upsert le compteur quotidien (1 message user = 1 increment).
      try {
        const newCount = currentCount + 1
        const newTokens =
          (usageRow ? 0 : 0) +
          (assistantUsage?.inputTokens ?? 0) +
          (assistantUsage?.outputTokens ?? 0)
        const newCost = assistantUsage?.costUsd ?? 0

        // Upsert : si la ligne existe on add, sinon on insert.
        const { error: upsertErr } = await supabase
          .from('sparkpilot_chat_usage')
          .upsert(
            {
              user_id: user.id,
              day: today,
              messages_count: newCount,
              tokens_used:
                (usageRow ? await loadExistingTokens(supabase, user.id, today) : 0) +
                newTokens,
              cost_usd:
                (usageRow ? await loadExistingCost(supabase, user.id, today) : 0) +
                newCost,
            },
            { onConflict: 'user_id,day' },
          )
        if (upsertErr) throw upsertErr
      } catch (err) {
        Sentry.captureException(err, {
          tags: { feature: 'sparkpilot-chat', step: 'usage-upsert' },
        })
      }

      // 4. Event final "done" pour signaler au client que c'est OK.
      if (!streamError) {
        send('done', {
          session_id: finalSessionId,
          tokens_input: assistantUsage?.inputTokens ?? 0,
          tokens_output: assistantUsage?.outputTokens ?? 0,
          cost_usd: assistantUsage?.costUsd ?? 0,
        })
      }
      controller.close()
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

/**
 * Charge tout le contexte enrichi pour le system prompt :
 * profil utilisateur, plan ouvert (+ stats), tâche ouverte, scan source.
 *
 * Tolère les erreurs : si une étape échoue, on continue sans le bloc
 * correspondant (le coach pourra quand même répondre, juste avec moins
 * de contexte).
 */
async function loadContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  page: ChatPageContext,
  planId: string | null,
  taskId: string | null,
  pageUrl: string | undefined,
): Promise<ChatBuildContext> {
  const ctx: ChatBuildContext = {
    user: { firstName: null, fullName: null, metier: null, ville: null },
    page,
    pageUrl,
    plan: null,
    task: null,
  }

  // Profil utilisateur (depuis profiles + user_metadata).
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', userId)
      .maybeSingle<ProfileRow>()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    const meta = (authUser?.user_metadata ?? {}) as Record<string, unknown>
    const firstName =
      (typeof meta.first_name === 'string' ? meta.first_name : '') ||
      profile?.full_name?.split(' ')[0] ||
      null
    ctx.user = {
      firstName,
      fullName: profile?.full_name ?? null,
      metier: typeof meta.metier === 'string' ? meta.metier : null,
      ville: typeof meta.city === 'string' ? meta.city : null,
      company: typeof meta.company === 'string' ? meta.company : null,
    }
  } catch {
    // Profil pas dispo → reste sur les defaults.
  }

  // Si on a une task_id : on charge la task + son plan parent.
  if (taskId) {
    try {
      const { data: task } = await supabase
        .from('sparkpilot_tasks')
        .select(
          'id, plan_id, priority_index, title, description, due_date, estimated_duration_minutes, status, completed_at, order_index, metadata, created_at',
        )
        .eq('id', taskId)
        .maybeSingle<SparkpilotTask>()
      if (task) {
        ctx.task = task
        // Charge le plan parent pour les méta-priorités.
        const { data: plan } = await supabase
          .from('sparkpilot_plans')
          .select('id, user_id, scan_id, title, status, metadata, created_at')
          .eq('id', task.plan_id)
          .eq('user_id', userId)
          .maybeSingle<SparkpilotPlan>()
        if (plan) {
          ctx.plan = plan
          const priorities = extractPrioritiesFromPlan(plan)
          const parentPriority = priorities.find(
            (p) => p.index === task.priority_index,
          )
          ctx.taskPriorityLabel = parentPriority?.title ?? null
          ctx.taskPriorityCategory = parentPriority?.playbook_category ?? null
          ctx.planStats = await loadPlanStats(supabase, plan.id)
          ctx.scanSnapshot = await loadScanSnapshot(supabase, plan.scan_id)
        }
      }
    } catch {
      // Tâche/plan illisible → on continue sans.
    }
  } else if (planId) {
    // Si seulement un plan_id : charge le plan + stats + scan source.
    try {
      const { data: plan } = await supabase
        .from('sparkpilot_plans')
        .select('id, user_id, scan_id, title, status, metadata, created_at')
        .eq('id', planId)
        .eq('user_id', userId)
        .maybeSingle<SparkpilotPlan>()
      if (plan) {
        ctx.plan = plan
        ctx.planStats = await loadPlanStats(supabase, plan.id)
        ctx.scanSnapshot = await loadScanSnapshot(supabase, plan.scan_id)
      }
    } catch {
      // Plan introuvable → continue sans.
    }
  }

  return ctx
}

/** Compte rapide des tâches du plan par statut + retard. */
async function loadPlanStats(
  supabase: Awaited<ReturnType<typeof createClient>>,
  planId: string,
): Promise<PlanStats | null> {
  try {
    const { data: tasks } = await supabase
      .from('sparkpilot_tasks')
      .select('id, status, due_date')
      .eq('plan_id', planId)
    if (!tasks) return null
    const todayStr = todayUtc()
    let done = 0
    let todo = 0
    let overdue = 0
    for (const t of tasks as Array<{ status: string; due_date: string | null }>) {
      if (t.status === 'done') done += 1
      else todo += 1
      if (
        t.status !== 'done' &&
        t.due_date &&
        t.due_date < todayStr
      ) {
        overdue += 1
      }
    }
    return {
      totalTasks: tasks.length,
      doneTasks: done,
      todoTasks: todo,
      overdueTasks: overdue,
    }
  } catch {
    return null
  }
}

/** Snapshot succinct du scan source (URL + zone + résumé exécutif). */
async function loadScanSnapshot(
  supabase: Awaited<ReturnType<typeof createClient>>,
  scanId: string | null,
): Promise<ChatBuildContext['scanSnapshot']> {
  if (!scanId) return null
  try {
    const { data } = await supabase
      .from('sparkscan_scans')
      .select('id, input_url, zone, synthesis')
      .eq('id', scanId)
      .maybeSingle<ScanSnapshotRow>()
    if (!data) return null
    return {
      input_url: data.input_url ?? undefined,
      zone: data.zone ?? undefined,
      executive_summary: data.synthesis?.executive_summary,
    }
  } catch {
    return null
  }
}

interface PriorityMetaLike {
  index: 1 | 2 | 3
  title: string
  reason?: string
  playbook_category?: string
}

function extractPrioritiesFromPlan(plan: SparkpilotPlan): PriorityMetaLike[] {
  const raw = (plan.metadata as { priorities?: unknown })?.priorities
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (p): p is PriorityMetaLike =>
      typeof p === 'object' &&
      p !== null &&
      typeof (p as { index?: unknown }).index === 'number' &&
      typeof (p as { title?: unknown }).title === 'string',
  )
}

async function loadExistingTokens(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  day: string,
): Promise<number> {
  const { data } = await supabase
    .from('sparkpilot_chat_usage')
    .select('tokens_used')
    .eq('user_id', userId)
    .eq('day', day)
    .maybeSingle<{ tokens_used: number }>()
  return data?.tokens_used ?? 0
}

async function loadExistingCost(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  day: string,
): Promise<number> {
  const { data } = await supabase
    .from('sparkpilot_chat_usage')
    .select('cost_usd')
    .eq('user_id', userId)
    .eq('day', day)
    .maybeSingle<{ cost_usd: number | string }>()
  // numeric() peut revenir en string selon le driver — on caste.
  const raw = data?.cost_usd
  if (raw === null || raw === undefined) return 0
  return typeof raw === 'number' ? raw : Number(raw)
}

/** Date du jour au format YYYY-MM-DD en UTC (cohérent avec le default). */
function todayUtc(): string {
  const d = new Date()
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
