// =============================================================================
// DCG AI — Resolve URL endpoint
// =============================================================================
//
// CONTEXTE
// --------
// Le bloc HTML "Chat Demo" du funnel GHL `01a. AI Demo (Dynamic) TM` reçoit
// `?url=...&email=...` en paramètre. Quand `url` est une page Facebook /
// Instagram / LinkedIn, on NE PEUT PAS l'afficher dans un iframe (FB renvoie
// une page de login). On veut afficher le mini-site DCG AI à la place — celui
// que Smart Crawler a généré et écrit dans `contact.website`.
//
// Côté GHL on a essayé d'utiliser `{{contact.website}}` directement dans le
// script Pat, mais GHL ne résout PAS les variables `{{contact.X}}` sur les
// pages funnel publiques chargées via trigger link. La variable reste la
// chaîne littérale `"{{contact.website}}"`.
//
// Cet endpoint contourne le problème : il fait le lookup GHL côté serveur et
// retourne JSON `{ website }` au navigateur. Le code Pat appelle cet endpoint
// avant de créer l'iframe, et utilise la valeur retournée comme src.
//
// CORS
// ----
// L'endpoint est appelé depuis `demo.digital-code-growth.com` (page funnel
// GHL). Header `Access-Control-Allow-Origin: *` requis.
// =============================================================================

import { NextRequest } from 'next/server'

export const runtime = 'edge'

const GHL_API_BASE = 'https://services.leadconnectorhq.com'
const GHL_LOCATION_ID = '15W1kS8V6KqgTPhtzaPZ' // sub-account DCG AI

function corsHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = new URL(request.url)
  const email = (searchParams.get('email') || '').trim()

  if (!email) {
    return new Response(JSON.stringify({ website: null, error: 'email required' }), {
      status: 400,
      headers: corsHeaders(),
    })
  }

  const pit = process.env.GHL_PIT_TOKEN
  if (!pit) {
    console.warn('[resolve-url] GHL_PIT_TOKEN missing')
    return new Response(JSON.stringify({ website: null, error: 'pit missing' }), {
      status: 200,
      headers: corsHeaders(),
    })
  }

  try {
    const url = `${GHL_API_BASE}/contacts/?locationId=${GHL_LOCATION_ID}&query=${encodeURIComponent(email)}`
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${pit}`,
        Version: '2021-07-28',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      console.warn(`[resolve-url] GHL lookup ${res.status} for ${email}`)
      return new Response(
        JSON.stringify({ website: null, error: `ghl ${res.status}` }),
        { status: 200, headers: corsHeaders() }
      )
    }

    const data = (await res.json()) as {
      contacts?: Array<{ website?: string; email?: string }>
    }
    const list = data.contacts || []
    const match =
      list.find((c) => c.email?.toLowerCase() === email.toLowerCase()) || list[0]
    const website = match?.website || null

    return new Response(JSON.stringify({ website }), {
      status: 200,
      headers: corsHeaders(),
    })
  } catch (e) {
    console.warn('[resolve-url] error:', e)
    return new Response(
      JSON.stringify({ website: null, error: String(e) }),
      { status: 200, headers: corsHeaders() }
    )
  }
}
