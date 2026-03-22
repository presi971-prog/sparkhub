// Debug endpoint — capture et affiche le body reçu de GHL
// À SUPPRIMER après le debug

import { NextRequest, NextResponse } from 'next/server'

// Stockage en mémoire du dernier body reçu
let lastBody: unknown = null
let lastTimestamp: string = ''

export async function POST(request: NextRequest) {
  try {
    lastBody = await request.json()
    lastTimestamp = new Date().toISOString()
    console.log('[SmartCrawler DEBUG] Body complet:', JSON.stringify(lastBody, null, 2))
    return NextResponse.json({ status: 'captured', timestamp: lastTimestamp })
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
}

export async function GET() {
  return NextResponse.json({
    lastTimestamp,
    body: lastBody,
  })
}
