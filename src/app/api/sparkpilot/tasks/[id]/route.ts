/**
 * Routes SparkPilot — modification et suppression d'une tâche.
 *
 *   PATCH  /api/sparkpilot/tasks/[id] → met à jour une tâche (status, due_date, titre…)
 *   DELETE /api/sparkpilot/tasks/[id] → supprime une tâche
 *
 * Toutes les opérations vérifient la propriété via RLS (le user ne peut
 * éditer que les tâches d'un plan qui lui appartient).
 */

import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

import { createClient } from '@/lib/supabase/server'
import type { SparkpilotTask, TaskStatus } from '@/lib/sparkpilot/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

const VALID_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'blocked', 'done']

interface PatchTaskPayload {
  title?: string
  description?: string | null
  due_date?: string | null
  estimated_duration_minutes?: number | null
  status?: TaskStatus
  order_index?: number
}

export async function PATCH(req: Request, context: RouteContext) {
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

  let payload: PatchTaskPayload
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  // On charge la tâche existante pour comparer (utile pour activity log).
  const { data: existing, error: existingError } = await supabase
    .from('sparkpilot_tasks')
    .select(
      'id, plan_id, priority_index, title, description, due_date, estimated_duration_minutes, status, completed_at, order_index, created_at',
    )
    .eq('id', id)
    .maybeSingle<SparkpilotTask>()

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 })
  }
  if (!existing) {
    return NextResponse.json({ error: 'Tâche introuvable' }, { status: 404 })
  }

  // Construit l'objet patch (en filtrant les champs invalides).
  const patch: Record<string, unknown> = {}
  if (typeof payload.title === 'string' && payload.title.trim().length > 0) {
    patch.title = payload.title.trim().slice(0, 300)
  }
  if (payload.description !== undefined) {
    patch.description =
      payload.description === null
        ? null
        : String(payload.description).slice(0, 1000)
  }
  if (payload.due_date !== undefined) {
    patch.due_date = payload.due_date === null ? null : payload.due_date
  }
  if (payload.estimated_duration_minutes !== undefined) {
    patch.estimated_duration_minutes =
      payload.estimated_duration_minutes === null
        ? null
        : Math.max(0, Math.round(Number(payload.estimated_duration_minutes)))
  }
  if (payload.status !== undefined) {
    if (!VALID_STATUSES.includes(payload.status)) {
      return NextResponse.json(
        {
          error: `Statut invalide. Autorisés : ${VALID_STATUSES.join(', ')}`,
        },
        { status: 400 },
      )
    }
    patch.status = payload.status
    // Côté serveur on aligne completed_at en fonction du statut.
    if (payload.status === 'done' && existing.status !== 'done') {
      patch.completed_at = new Date().toISOString()
    } else if (payload.status !== 'done' && existing.status === 'done') {
      patch.completed_at = null
    }
  }
  if (payload.order_index !== undefined) {
    patch.order_index = Math.max(0, Math.round(Number(payload.order_index)))
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: 'Aucun champ valide à mettre à jour' },
      { status: 400 },
    )
  }

  const { data: updated, error: updateError } = await supabase
    .from('sparkpilot_tasks')
    .update(patch)
    .eq('id', id)
    .select(
      'id, plan_id, priority_index, title, description, due_date, estimated_duration_minutes, status, completed_at, order_index, created_at',
    )
    .single<SparkpilotTask>()

  if (updateError) {
    Sentry.captureException(updateError, {
      tags: { feature: 'sparkpilot', step: 'task-update' },
    })
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Journal de bord : on note les changements significatifs.
  try {
    let eventType = 'task_updated'
    if (payload.status === 'done' && existing.status !== 'done') {
      eventType = 'task_completed'
    } else if (payload.status && payload.status !== 'done' && existing.status === 'done') {
      eventType = 'task_reopened'
    }
    await supabase.from('sparkpilot_activity').insert({
      user_id: user.id,
      plan_id: existing.plan_id,
      task_id: id,
      event_type: eventType,
      payload: {
        before: { status: existing.status, due_date: existing.due_date, title: existing.title },
        after: { status: updated.status, due_date: updated.due_date, title: updated.title },
      },
    })
  } catch (err) {
    Sentry.captureException(err, {
      tags: { feature: 'sparkpilot', step: 'activity-log' },
    })
  }

  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, context: RouteContext) {
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
    .select('id, plan_id, title')
    .eq('id', id)
    .maybeSingle<{ id: string; plan_id: string; title: string }>()

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 })
  }
  if (!existing) {
    return NextResponse.json({ error: 'Tâche introuvable' }, { status: 404 })
  }

  const { error: deleteError } = await supabase
    .from('sparkpilot_tasks')
    .delete()
    .eq('id', id)

  if (deleteError) {
    Sentry.captureException(deleteError, {
      tags: { feature: 'sparkpilot', step: 'task-delete' },
    })
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  try {
    await supabase.from('sparkpilot_activity').insert({
      user_id: user.id,
      plan_id: existing.plan_id,
      task_id: null, // la tâche n'existe plus, FK SET NULL
      event_type: 'task_deleted',
      payload: { title: existing.title, deleted_task_id: id },
    })
  } catch (err) {
    Sentry.captureException(err, {
      tags: { feature: 'sparkpilot', step: 'activity-log' },
    })
  }

  return NextResponse.json({ ok: true })
}
