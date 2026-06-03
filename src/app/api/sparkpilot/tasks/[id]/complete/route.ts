/**
 * POST /api/sparkpilot/tasks/[id]/complete
 *
 * Raccourci pour marquer une tâche comme "faite" :
 *   - met status = 'done' et completed_at = now()
 *   - logge un event 'task_completed' dans le journal
 *   - met à jour le plan en 'completed' si toutes ses tâches sont done
 */

import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

import { createClient } from '@/lib/supabase/server'
import type { SparkpilotTask } from '@/lib/sparkpilot/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(_req: Request, context: RouteContext) {
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

  const { data: existing, error: existingError } = await supabase
    .from('sparkpilot_tasks')
    .select('id, plan_id, title, status')
    .eq('id', id)
    .maybeSingle<{ id: string; plan_id: string; title: string; status: string }>()

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 })
  }
  if (!existing) {
    return NextResponse.json({ error: 'Tâche introuvable' }, { status: 404 })
  }
  if (existing.status === 'done') {
    return NextResponse.json(
      { ok: true, already_done: true },
      { status: 200 },
    )
  }

  const now = new Date().toISOString()
  const { data: updated, error: updateError } = await supabase
    .from('sparkpilot_tasks')
    .update({ status: 'done', completed_at: now })
    .eq('id', id)
    .select(
      'id, plan_id, priority_index, title, description, due_date, estimated_duration_minutes, status, completed_at, order_index, created_at',
    )
    .single<SparkpilotTask>()

  if (updateError) {
    Sentry.captureException(updateError, {
      tags: { feature: 'sparkpilot', step: 'task-complete' },
    })
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Journal de bord (best-effort).
  try {
    await supabase.from('sparkpilot_activity').insert({
      user_id: user.id,
      plan_id: existing.plan_id,
      task_id: id,
      event_type: 'task_completed',
      payload: { title: existing.title },
    })
  } catch (err) {
    Sentry.captureException(err, {
      tags: { feature: 'sparkpilot', step: 'activity-log' },
    })
  }

  // Si toutes les tâches du plan sont done → on bascule le plan en 'completed'.
  // On utilise `head: true` + `count: exact` pour récupérer juste le compteur
  // sans rapatrier les lignes (économe en bande passante).
  try {
    const { count } = await supabase
      .from('sparkpilot_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('plan_id', existing.plan_id)
      .neq('status', 'done')

    if (count === 0) {
      await supabase
        .from('sparkpilot_plans')
        .update({ status: 'completed' })
        .eq('id', existing.plan_id)
    }
  } catch (err) {
    Sentry.captureException(err, {
      tags: { feature: 'sparkpilot', step: 'plan-auto-complete' },
    })
  }

  return NextResponse.json(updated)
}
