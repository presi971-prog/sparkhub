import { NextResponse } from 'next/server'

const GHL_BASE = 'https://services.leadconnectorhq.com'

export async function GET() {
  const pit = process.env.GHL_SOCIAL_PIT
  const locationId = process.env.GHL_LOCATION_ID
  const userId = process.env.GHL_USER_ID

  const missing: string[] = []
  if (!pit) missing.push('GHL_SOCIAL_PIT')
  if (!locationId) missing.push('GHL_LOCATION_ID')
  if (!userId) missing.push('GHL_USER_ID')

  if (missing.length > 0) {
    return NextResponse.json(
      { ok: false, reason: 'env_missing', missing },
      { status: 500 }
    )
  }

  try {
    const r = await fetch(
      `${GHL_BASE}/social-media-posting/${locationId}/accounts`,
      {
        headers: {
          Authorization: `Bearer ${pit}`,
          Version: '2021-07-28',
        },
        cache: 'no-store',
      }
    )

    if (!r.ok) {
      const body = await r.text()
      return NextResponse.json(
        { ok: false, reason: 'ghl_error', status: r.status, body: body.slice(0, 500) },
        { status: r.status === 401 ? 401 : 502 }
      )
    }

    const data = await r.json()
    const accounts = data?.accounts || data?.results?.accounts || []
    return NextResponse.json({
      ok: true,
      accountsCount: accounts.length,
      accounts: accounts.map((a: { id: string; platform?: string; name?: string }) => ({
        id: a.id,
        platform: a.platform,
        name: a.name,
      })),
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, reason: 'fetch_error', error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
