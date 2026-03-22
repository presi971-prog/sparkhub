// Smart Crawler — Webhook endpoint
// Reçoit les demandes de crawl depuis GHL (remplace TurboMock)

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getRateLimitKey } from '@/lib/rate-limit'
import { crawlAndExtract } from '@/lib/smart-crawler/orchestrator'
import type { WebhookPayload } from '@/lib/smart-crawler/types'

// Augmenter le timeout Vercel à 60 secondes (Pro plan)
export const maxDuration = 60

const SERVER_PIT = process.env.GHL_PIT_TOKEN

export async function POST(request: NextRequest) {
  // 1. Rate limit : 20 req/min par IP (protection anti-spam)
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

  // 8. Traitement synchrone — on attend le résultat avant de répondre
  try {
    await crawlAndExtract(payload)
    return NextResponse.json({
      status: 'completed',
      contactId,
      message: 'Smart Crawler finished. Contact fields updated.',
    })
  } catch (error) {
    console.error(`[SmartCrawler] Erreur pour contact ${contactId}:`, error)
    return NextResponse.json({
      status: 'error',
      contactId,
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
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
