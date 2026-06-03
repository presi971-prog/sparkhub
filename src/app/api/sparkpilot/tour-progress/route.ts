/**
 * Route SparkPilot — état du tutoriel interactif (Driver.js).
 *
 *   GET   /api/sparkpilot/tour-progress   → renvoie l'état du tour de l'user
 *                                            (crée la ligne si elle n'existe pas).
 *   PATCH /api/sparkpilot/tour-progress   → marque un écran comme "vu"
 *                                            (body : { key, done }).
 *
 * Sert le composant <SparkPilotTour /> qui décide :
 *   - de lancer auto la visite guidée si l'écran courant n'a jamais été vu
 *   - ou de rester silencieux si l'user a déjà fait le tour
 */

import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

import { createClient } from '@/lib/supabase/server'

// Les 4 écrans pour lesquels on garde un tour distinct. Doit rester en sync
// avec les clés exportées dans /src/lib/sparkpilot/tour/steps.ts.
const VALID_KEYS = ['dashboard', 'plan', 'calendrier', 'frameworks'] as const
type TourKey = (typeof VALID_KEYS)[number]

interface TourProgressRow {
  user_id: string
  dashboard_done: boolean
  plan_done: boolean
  calendrier_done: boolean
  frameworks_done: boolean
  last_completed_at: string | null
  created_at: string
  updated_at: string
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  // 1. Tentative de lecture.
  const { data: existing, error: readError } = await supabase
    .from('sparkpilot_tour_progress')
    .select(
      'user_id, dashboard_done, plan_done, calendrier_done, frameworks_done, last_completed_at, created_at, updated_at',
    )
    .eq('user_id', user.id)
    .maybeSingle<TourProgressRow>()

  if (readError) {
    Sentry.captureException(readError, {
      tags: { feature: 'sparkpilot-tour', step: 'read' },
    })
    return NextResponse.json({ error: readError.message }, { status: 500 })
  }

  if (existing) {
    return NextResponse.json({ progress: existing })
  }

  // 2. Pas encore de ligne → on l'initialise (tous les booléens à false).
  //    Idempotent grâce au PK sur user_id : un éventuel conflit renverra
  //    une erreur 23505 qu'on remap proprement.
  const { data: inserted, error: insertError } = await supabase
    .from('sparkpilot_tour_progress')
    .insert({ user_id: user.id })
    .select(
      'user_id, dashboard_done, plan_done, calendrier_done, frameworks_done, last_completed_at, created_at, updated_at',
    )
    .single<TourProgressRow>()

  if (insertError) {
    Sentry.captureException(insertError, {
      tags: { feature: 'sparkpilot-tour', step: 'insert' },
    })
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ progress: inserted })
}

interface PatchPayload {
  key?: string
  done?: boolean
}

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  let body: PatchPayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const key = body.key as TourKey | undefined
  if (!key || !VALID_KEYS.includes(key)) {
    return NextResponse.json(
      { error: `Champ "key" invalide. Attendu : ${VALID_KEYS.join(', ')}` },
      { status: 400 },
    )
  }
  const done = body.done === true

  // Upsert : si la ligne n'existe pas encore (cas limite), on la crée à la volée.
  const column = `${key}_done` as const
  const patch: Record<string, unknown> = {
    user_id: user.id,
    [column]: done,
    updated_at: new Date().toISOString(),
  }
  if (done) {
    patch.last_completed_at = new Date().toISOString()
  }

  const { data: upserted, error: upsertError } = await supabase
    .from('sparkpilot_tour_progress')
    .upsert(patch, { onConflict: 'user_id' })
    .select(
      'user_id, dashboard_done, plan_done, calendrier_done, frameworks_done, last_completed_at, created_at, updated_at',
    )
    .single<TourProgressRow>()

  if (upsertError) {
    Sentry.captureException(upsertError, {
      tags: { feature: 'sparkpilot-tour', step: 'upsert' },
      extra: { key, done },
    })
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  return NextResponse.json({ progress: upserted })
}
