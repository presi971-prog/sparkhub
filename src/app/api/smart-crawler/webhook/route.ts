// Smart Crawler — Webhook endpoint
// Reçoit les demandes de crawl depuis GHL (remplace TurboMock)

import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { rateLimit, getRateLimitKey } from '@/lib/rate-limit'
import { crawlAndExtract } from '@/lib/smart-crawler/orchestrator'
import type { WebhookPayload } from '@/lib/smart-crawler/types'

const EXPECTED_PIT = process.env.GHL_PIT_TOKEN

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

  // 3. Extraire les champs
  const contactId = (body.contactId || body.contact_id) as string | undefined
  const pit = (body.pit || body.PIT) as string | undefined
  const locationId = (body.locationId || body.location_id) as string | undefined
  const website = (body.website || body.Website) as string | undefined
  const facebook_url = (body.facebook_url || body.Facebook) as string | undefined
  const instagram_url = (body.instagram_url || body.Instagram) as string | undefined
  const linkedin_url = (body.linkedin_url || body.LinkedIn) as string | undefined
  const company_name = (body.company_name || body.companyName) as string | undefined
  const first_name = (body.first_name || body.firstName) as string | undefined
  const email = body.email as string | undefined

  // 4. Validation
  if (!contactId) {
    console.error('[SmartCrawler] Webhook sans contactId:', JSON.stringify(body).slice(0, 500))
    return NextResponse.json({ error: 'Missing contactId' }, { status: 400 })
  }

  if (!pit) {
    return NextResponse.json({ error: 'Missing PIT token' }, { status: 400 })
  }

  // 5. Vérifier le PIT (si configuré côté serveur)
  if (EXPECTED_PIT && pit !== EXPECTED_PIT) {
    console.error(`[SmartCrawler] PIT invalide pour contact ${contactId}`)
    return NextResponse.json({ error: 'Invalid PIT' }, { status: 403 })
  }

  // 6. Au moins une URL requise
  if (!website && !facebook_url && !instagram_url && !linkedin_url) {
    console.warn(`[SmartCrawler] Contact ${contactId}: aucune URL fournie`)
    return NextResponse.json({ error: 'No URLs provided' }, { status: 400 })
  }

  // 7. Construire le payload
  const payload: WebhookPayload = {
    contactId,
    locationId: locationId || '',
    pit,
    website: website || undefined,
    facebook_url: facebook_url || undefined,
    instagram_url: instagram_url || undefined,
    linkedin_url: linkedin_url || undefined,
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

  // 8. Traitement asynchrone — retourne 200 immédiatement
  after(() => crawlAndExtract(payload))

  return NextResponse.json({
    status: 'processing',
    contactId,
    message: 'Smart Crawler started. Fields will be updated shortly.',
  })
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
