/**
 * Spark Compta — Webhook WhatsApp
 *
 * Reçoit les messages WhatsApp via l'API Cloud Meta (Phone Number ID
 * 809583478899370 côté Cobeone) et les route vers le bon pipeline.
 *
 * PLACEHOLDER Phase 2.A — à développer en Phase 3 Sprint 2 (semaine 3).
 *
 * Endpoints :
 *   GET  /api/spark-compta/webhooks/whatsapp → handshake de vérification Meta
 *   POST /api/spark-compta/webhooks/whatsapp → réception des événements
 *
 * Le GET doit renvoyer le hub.challenge si hub.verify_token matche
 * `WHATSAPP_VERIFY_TOKEN` (voir api-keys.md).
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const WHATSAPP_VERIFY_TOKEN = process.env.SPARK_COMPTA_WHATSAPP_VERIFY_TOKEN ?? ''

/**
 * Handshake Meta : Meta appelle cette URL une fois lors de la configuration
 * du webhook pour vérifier qu'on contrôle bien le domaine.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks/getting-started
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Note : `request.nextUrl.searchParams` est synchrone dans les Route Handlers
  // (API Web URLSearchParams standard). La règle "await searchParams" de
  // Next.js 16 concerne uniquement les Pages Server Components, pas les routes.
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json(
    { error: 'verification_failed' },
    { status: 403 }
  )
}

/**
 * Réception des événements WhatsApp (messages entrants, statuts, etc.)
 *
 * À implémenter en Phase 3 Sprint 2 :
 * 1. Valider la signature du webhook (header X-Hub-Signature-256)
 * 2. Parser le payload Meta
 * 3. Identifier le pro : lookup spark_compta_accounts via le numéro
 * 4. Router selon le type :
 *    - Message texte → classifier intent (GPT-4o-mini) → log / query / correction
 *    - Message audio → Whisper → reprise du flow texte
 *    - Message image → GPT-4o Vision → OCR ticket → log avec validation humaine si > 50 €
 * 5. Répondre au pro via WhatsApp Cloud API
 */
export async function POST(): Promise<NextResponse> {
  // Placeholder : retourne OK pour que Meta ne désactive pas le webhook
  // Le vrai traitement viendra en Phase 3 Sprint 2.
  return NextResponse.json({ status: 'accepted_placeholder' }, { status: 200 })
}
