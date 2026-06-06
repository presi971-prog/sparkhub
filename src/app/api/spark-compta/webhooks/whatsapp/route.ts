/**
 * Spark Compta — Webhook WhatsApp (réel)
 *
 * Reçoit les messages WhatsApp via l'API Cloud Meta et les route vers le
 * pipeline Spark Compta (classify + extract + insert + répondre).
 *
 * Endpoints :
 *   GET  /api/spark-compta/webhooks/whatsapp → handshake de vérification Meta
 *   POST /api/spark-compta/webhooks/whatsapp → réception des événements
 *
 * Configuration dans Meta Developer Console (WhatsApp Business API) :
 *   - Callback URL : https://<ton-domaine-public>/api/spark-compta/webhooks/whatsapp
 *   - Verify token : la valeur de WHATSAPP_VERIFY_TOKEN dans .env.local
 *   - Webhook fields : "messages"
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runWhatsappPipeline } from '@/lib/spark-compta/whatsapp-pipeline'
import {
  parseIncomingWebhookPayload,
  sendWhatsAppTextMessage,
} from '@/lib/spark-compta/whatsapp-client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ============================================================================
// GET — Handshake de vérification Meta
// ============================================================================
export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN ?? ''

  if (mode === 'subscribe' && token === expectedToken && challenge) {
    // Meta attend que l'on retourne le challenge en texte brut
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  return NextResponse.json(
    { error: 'verification_failed', hint: 'mode/token mismatch' },
    { status: 403 }
  )
}

// ============================================================================
// POST — Réception des messages WhatsApp
// ============================================================================
export async function POST(request: NextRequest): Promise<NextResponse> {
  // IMPORTANT : Meta s'attend à recevoir une réponse 200 rapidement (sous 5 secondes)
  // sinon il considère que le webhook a échoué et réessaie. Notre pipeline peut
  // prendre 3-5 secondes (2 appels LLM + Supabase). On fait donc le traitement
  // en mode "fire and forget" : on répond 200 immédiatement et on traite en
  // arrière-plan.

  let payload: unknown
  try {
    payload = await request.json()
  } catch (error) {
    console.error('[spark-compta-webhook] Invalid JSON payload:', error)
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const messages = parseIncomingWebhookPayload(payload)

  if (messages.length === 0) {
    // Peut être un événement de statut (delivered, read) ou un autre event.
    // On répond 200 pour que Meta ne retry pas.
    return NextResponse.json({ status: 'no_messages' }, { status: 200 })
  }

  // Traiter chaque message en arrière-plan (non bloquant pour la réponse Meta)
  // Note : on utilise `void` pour bien exprimer qu'on n'attend pas la fin.
  void Promise.all(messages.map(processIncomingMessage)).catch((err) => {
    console.error('[spark-compta-webhook] Async processing error:', err)
  })

  // Réponse immédiate à Meta
  return NextResponse.json({ status: 'accepted', count: messages.length }, { status: 200 })
}

// ============================================================================
// Traitement d'un message individuel
// ============================================================================
async function processIncomingMessage(msg: {
  from: string
  type: string
  text?: string
  media_id?: string
  message_id: string
}): Promise<void> {
  const startTime = Date.now()

  try {
    // Pour la v1 du Sprint 2, on traite uniquement les messages texte.
    // OCR photo et transcription vocale viendront au Sprint 4.
    if (msg.type !== 'text' || !msg.text) {
      await sendWhatsAppTextMessage({
        to: msg.from,
        body:
          "Je sais seulement lire les messages texte pour l'instant. Les photos de tickets et les notes vocales arrivent bientôt !",
      })
      return
    }

    // Client Supabase côté serveur (service role pour bypasser les RLS
    // puisqu'on est dans un contexte webhook, pas une session user).
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
      { auth: { persistSession: false, autoRefreshToken: false } }
    )

    // Lancer le pipeline Spark Compta
    const outcome = await runWhatsappPipeline({
      senderPhone: msg.from,
      messageText: msg.text,
      supabase,
    })

    // Envoyer la réponse au pro via WhatsApp
    const sendResult = await sendWhatsAppTextMessage({
      to: msg.from,
      body: outcome.reply_text,
    })

    const elapsed = Date.now() - startTime
    console.log(
      `[spark-compta-webhook] Processed message ${msg.message_id} from ${msg.from} in ${elapsed}ms — outcome: ${outcome.status}, send: ${sendResult.success ? 'ok' : sendResult.error}`
    )
  } catch (error) {
    console.error(
      `[spark-compta-webhook] Error processing message ${msg.message_id}:`,
      error
    )

    // Tenter de renvoyer un message d'erreur au pro
    try {
      await sendWhatsAppTextMessage({
        to: msg.from,
        body: "Désolé, une erreur technique m'empêche de traiter ton message. Réessaie dans quelques instants.",
      })
    } catch {
      // Silent fail sur la réponse d'erreur, on ne peut rien faire de plus
    }
  }
}
