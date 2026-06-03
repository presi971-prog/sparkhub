/**
 * Routes SparkPilot — liste et création de plans.
 *
 *   POST /api/sparkpilot/plans  → crée un plan à partir d'un scan_id (déclenche la décomposition Claude)
 *   GET  /api/sparkpilot/plans  → liste les plans actifs de l'utilisateur connecté
 */

import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

import { createClient } from '@/lib/supabase/server'
import { decomposeReportToTasks } from '@/lib/sparkpilot/decompose'
import type { SparkpilotPlan } from '@/lib/sparkpilot/types'

// La décomposition appelle Claude et peut prendre 10-30s en pic.
// Maxduration 60s pour rester confortable sans tomber dans les timeouts.
export const maxDuration = 60

interface CreatePlanPayload {
  scan_id?: string
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  let body: CreatePlanPayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const scanId = body.scan_id?.trim()
  if (!scanId) {
    return NextResponse.json(
      { error: 'Champ requis : scan_id' },
      { status: 400 },
    )
  }

  // Idempotence : si l'utilisateur a déjà un plan pour ce scan, on renvoie
  // l'id existant au lieu de relancer la décomposition Claude (qui est coûteuse
  // et créerait un doublon visible côté UI). Le client peut donc cliquer
  // plusieurs fois sans risque, et arrive toujours sur le même plan.
  const { data: existingPlan, error: existingPlanError } = await supabase
    .from('sparkpilot_plans')
    .select('id')
    .eq('user_id', user.id)
    .eq('scan_id', scanId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>()

  if (existingPlanError) {
    Sentry.captureException(existingPlanError, {
      tags: { feature: 'sparkpilot', step: 'plan-existing-check' },
      extra: { scanId, userId: user.id },
    })
    // On loggue mais on n'interrompt pas : on tente la création quand même.
  }

  if (existingPlan?.id) {
    return NextResponse.json(
      {
        plan_id: existingPlan.id,
        tasks_inserted: 0,
        cost_usd: 0,
        existing: true,
      },
      { status: 200 },
    )
  }

  try {
    const result = await decomposeReportToTasks(scanId, supabase, user.id)
    return NextResponse.json(
      {
        plan_id: result.planId,
        tasks_inserted: result.tasksInserted,
        cost_usd: result.costUsd,
      },
      { status: 201 },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    Sentry.captureException(err, {
      tags: { feature: 'sparkpilot', step: 'plan-create' },
      extra: { scanId, userId: user.id },
    })
    // Les erreurs "scan introuvable" ou "pas de priorités" sont des 400 logiques.
    const status =
      message.includes('introuvable') || message.includes('priorités')
        ? 400
        : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('sparkpilot_plans')
    .select('id, user_id, scan_id, title, status, metadata, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    Sentry.captureException(error, {
      tags: { feature: 'sparkpilot', step: 'plans-list' },
    })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ plans: (data ?? []) as SparkpilotPlan[] })
}
