// Smart Crawler — Webhook endpoint
// Reçoit les demandes de crawl depuis GHL (remplace TurboMock)
//
// IMPORTANT : on répond 202 immédiatement à GHL et on traite en arrière-plan
// via `after()` (Next.js 16). Raison : Smart Crawler peut prendre 30-90s
// (Apify + Claude + écriture GHL), et si on attendait, GHL pourrait timeout
// et retenter → double crawl, double facture Apify. Aujourd'hui le flux GHL
// surveille les Custom Fields du contact (pas la réponse webhook), donc on
// peut découpler en toute sécurité.

import { NextRequest, NextResponse, after } from 'next/server'
import { rateLimit, getRateLimitKey } from '@/lib/rate-limit'
import { crawlAndExtract } from '@/lib/smart-crawler/orchestrator'
import type { WebhookPayload } from '@/lib/smart-crawler/types'

// Phase synchrone très courte (parse + validate). La phase longue
// (crawl + extraction) tourne en arrière-plan via after().
// after() permet jusqu'à 5 minutes de traitement après la réponse HTTP (Pro plan).
export const maxDuration = 60

const SERVER_PIT = process.env.GHL_PIT_TOKEN

export async function POST(request: NextRequest) {
  // 0. Vérification du secret partagé X-Webhook-Secret (R0 sécurité)
  //    GHL doit envoyer ce header avec la valeur de SMART_CRAWLER_WEBHOOK_SECRET.
  //    Sans ce header, on rejette : un attaquant ne doit pas pouvoir vider notre
  //    crédit Apify ou modifier un contact GHL en falsifiant le contactId.
  const expectedSecret = process.env.SMART_CRAWLER_WEBHOOK_SECRET
  if (!expectedSecret) {
    console.error('[SmartCrawler] SMART_CRAWLER_WEBHOOK_SECRET non défini côté serveur — webhook indisponible')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }
  const receivedSecret = request.headers.get('x-webhook-secret')
  if (receivedSecret !== expectedSecret) {
    console.warn('[SmartCrawler] Webhook rejeté : X-Webhook-Secret manquant ou invalide')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 1. Rate limit : 20 req/min par IP (protection anti-spam additionnelle)
  const rl = rateLimit(getRateLimitKey(request), 20, 60_000)
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  // 2. Parser le body
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // 3. GHL envoie les données personnalisées dans body.customData
  const customData = body.customData as Record<string, unknown> | undefined

  // 4. Extraire les champs (customData d'abord, puis racine en fallback)
  const contactId = (customData?.contactId || body.contact_id || body.contactId) as string | undefined
  const pit = (customData?.pit || body.pit) as string | undefined
  const locationObj = body.location as Record<string, unknown> | undefined
  const locationId = (locationObj?.id || body.locationId) as string | undefined
  const website = (customData?.website || body.website) as string | undefined
  const facebook_url = (customData?.facebook_url || body['Facebook URL']) as string | undefined
  const instagram_url = (customData?.instagram_url || body['Instagram URL']) as string | undefined
  const linkedin_url = (customData?.linkedin_url || body['LinkedIn URL']) as string | undefined
  const company_name = (customData?.company_name || body.company_name) as string | undefined
  const first_name = (body.first_name) as string | undefined
  const email = (customData?.email || body.email) as string | undefined

  console.log(`[SmartCrawler] Parsed: contact=${contactId}, fb=${facebook_url}, web=${website}`)

  // 4. Validation
  if (!contactId) {
    console.error('[SmartCrawler] Webhook sans contactId:', JSON.stringify(body).slice(0, 500))
    return NextResponse.json({ error: 'Missing contactId' }, { status: 400 })
  }

  // 5. Utiliser le PIT du webhook ou celui du serveur
  const activePit = pit || SERVER_PIT
  if (!activePit) {
    return NextResponse.json({ error: 'No PIT token available' }, { status: 400 })
  }

  // 6. Nettoyer les URLs vides (GHL envoie "https://" quand un champ est vide)
  const isValidUrl = (u?: string) => u && u.trim() !== '' && u.trim() !== 'https://' && u.trim() !== 'http://'
  const cleanWebsite = isValidUrl(website) ? website : undefined
  const cleanFacebook = isValidUrl(facebook_url) ? facebook_url : undefined
  const cleanInstagram = isValidUrl(instagram_url) ? instagram_url : undefined
  const cleanLinkedin = isValidUrl(linkedin_url) ? linkedin_url : undefined

  if (!cleanWebsite && !cleanFacebook && !cleanInstagram && !cleanLinkedin) {
    console.warn(`[SmartCrawler] Contact ${contactId}: aucune URL valide`)
    return NextResponse.json({ error: 'No valid URLs provided' }, { status: 400 })
  }

  // 7. Construire le payload
  const payload: WebhookPayload = {
    contactId,
    locationId: locationId || '',
    pit: activePit,
    website: cleanWebsite,
    facebook_url: cleanFacebook,
    instagram_url: cleanInstagram,
    linkedin_url: cleanLinkedin,
    company_name: company_name || undefined,
    first_name: first_name || undefined,
    email: email || undefined,
  }

  console.log(`[SmartCrawler] Webhook reçu: contact=${contactId}, sources=[${[
    website && 'web',
    facebook_url && 'fb',
    instagram_url && 'ig',
    linkedin_url && 'li',
  ].filter(Boolean).join(',')}]`)

  // 8. Traitement ASYNCHRONE — on répond 202 immédiatement à GHL
  //    et on lance crawlAndExtract en arrière-plan via after().
  //    Le workflow GHL surveille les Custom Fields du contact (pas la réponse
  //    webhook), donc il sera notifié quand l'analyse est terminée.
  //    Si le crawl échoue (URL pourrie), markContactAsCrawlerFailed (dans
  //    l'orchestrator) ajoute le tag `smart-crawler-failed` qui déclenche le
  //    workflow GHL "Smart Crawler Échec — Demande de Rappel".
  after(async () => {
    try {
      await crawlAndExtract(payload)
    } catch (error) {
      console.error(`[SmartCrawler] Erreur background pour contact ${contactId}:`, error)
      // markContactAsCrawlerFailed est appelée à l'intérieur de crawlAndExtract
      // sur les 2 cas d'échec connus (aucune source crawlée + extraction IA KO).
      // Pour les erreurs inattendues ici, on logge — un futur fix ajoutera un
      // call markContactAsCrawlerFailed avec un fallback global.
    }
  })

  return NextResponse.json({
    status: 'started',
    contactId,
    message: 'Smart Crawler started. Contact fields will be updated within ~60s.',
  }, { status: 202 })
}

// GET pour vérifier que l'endpoint est actif
export async function GET() {
  return NextResponse.json({
    service: 'Smart Crawler',
    status: 'active',
    version: '1.0.0',
    description: 'Replaces TurboMock — crawls websites + social media for DemoDrop',
  })
}
