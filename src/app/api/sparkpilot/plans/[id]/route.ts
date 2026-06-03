/**
 * GET /api/sparkpilot/plans/[id]
 *
 * Récupère un plan SparkPilot avec toutes ses tâches associées.
 * Filtré par RLS : un user ne voit que ses propres plans.
 */

import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

import { createClient } from '@/lib/supabase/server'
import type {
  PlanWithTasks,
  SparkpilotPlan,
  SparkpilotTask,
} from '@/lib/sparkpilot/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_req: Request, context: RouteContext) {
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

  // RLS filtre déjà sur user_id, on ajoute le check explicite (defense in depth).
  const { data: planRow, error: planError } = await supabase
    .from('sparkpilot_plans')
    .select('id, user_id, scan_id, title, status, metadata, created_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle<SparkpilotPlan>()

  if (planError) {
    Sentry.captureException(planError, {
      tags: { feature: 'sparkpilot', step: 'plan-read' },
    })
    return NextResponse.json({ error: planError.message }, { status: 500 })
  }
  if (!planRow) {
    return NextResponse.json({ error: 'Plan introuvable' }, { status: 404 })
  }

  const { data: tasksRows, error: tasksError } = await supabase
    .from('sparkpilot_tasks')
    .select(
      'id, plan_id, priority_index, title, description, due_date, estimated_duration_minutes, status, completed_at, order_index, created_at',
    )
    .eq('plan_id', id)
    .order('order_index', { ascending: true })

  if (tasksError) {
    Sentry.captureException(tasksError, {
      tags: { feature: 'sparkpilot', step: 'tasks-read' },
    })
    return NextResponse.json({ error: tasksError.message }, { status: 500 })
  }

  const result: PlanWithTasks = {
    ...planRow,
    tasks: (tasksRows ?? []) as SparkpilotTask[],
  }

  return NextResponse.json(result)
}
