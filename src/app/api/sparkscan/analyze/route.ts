import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { startScanInBackground, type NiveauZone } from '@/lib/sparkscan/competitors'
import { getSparkScanAdminClient } from '@/lib/sparkscan/supabase-admin'
import type { ClientContext } from '@/lib/sparkscan/qualifier'

// Le pipeline complet (méthode B + Apify Maps + Apify RS + Claude × N) est long.
// ⚠️ Forfait Vercel HOBBY = max 300s par fonction (800 faisait échouer le déploiement).
// Capé à 300. Si l'analyse profonde dépasse 5 min en prod → passer le projet en
// Vercel Pro (jusqu'à 800s) OU exécuter le pipeline en arrière-plan (webhook).
export const maxDuration = 300

interface AnalyzePayload {
  url?: string
  zone?: string
  niveau_zone?: string
  langue?: string
  client_context?: ClientContext
}

const VALID_NIVEAUX: NiveauZone[] = [
  'pays',
  'region',
  'departement',
  'ville',
]

const VALID_OBJECTIVES: ClientContext['objective'][] = [
  'acquisition',
  'fidelisation',
  'differenciation',
  'defense',
]
const VALID_TEAMS: ClientContext['team_size'][] = ['solo', '2-5', '5+']
const VALID_BUDGETS: ClientContext['monthly_budget'][] = [
  'under_500',
  '500_2000',
  '2000_plus',
]
const VALID_HORIZONS: ClientContext['horizon'][] = ['30j', '90j', '6m']

// Rate limit : max N scans complétés par user dans les 24h.
const RATE_LIMIT_PER_DAY = 10
// Rate limit coût : max $X dépensés en API externes par user dans les 24h.
// 1 scan complet coûte ~$0.50-0.60 → $6 = 10-12 scans réels, alignés sur le count limit.
// Protège contre un attaquant qui découvrirait un moyen de bypass le count.
const COST_LIMIT_PER_DAY_USD = 6

/**
 * Anti-SSRF : refuse les URLs qui pointent vers des cibles internes ou des
 * endpoints sensibles (metadata cloud, IP privées, localhost). Sans cette
 * protection, un attaquant peut faire scraper http://169.254.169.254/ (AWS
 * metadata) pour exfiltrer les credentials du serveur.
 *
 * Retourne l'URL nettoyée (avec https://) si OK, throw sinon.
 */
function sanitizeTargetUrl(raw: string): string {
  let parsed: URL
  try {
    parsed = new URL(raw.startsWith('http') ? raw : `https://${raw}`)
  } catch {
    throw new Error('URL invalide')
  }
  const proto = parsed.protocol.replace(':', '').toLowerCase()
  if (proto !== 'http' && proto !== 'https') {
    throw new Error(`Protocole non autorisé : ${proto}`)
  }
  const hostname = parsed.hostname.toLowerCase()
  // Hostnames bloqués (localhost, loopback, broadcast)
  if (
    hostname === 'localhost' ||
    hostname === 'broadcasthost' ||
    hostname === '0.0.0.0' ||
    hostname === '255.255.255.255'
  ) {
    throw new Error(`URL pointant vers une cible interne : ${hostname}`)
  }
  // Bloque IP privées + metadata cloud
  // - 10.0.0.0/8         (privé classe A)
  // - 172.16.0.0/12      (privé classe B — simplifié : on bloque 172.16-31)
  // - 192.168.0.0/16     (privé classe C)
  // - 127.0.0.0/8        (loopback)
  // - 169.254.0.0/16     (link-local, AWS/GCP metadata 169.254.169.254)
  // - ::1, fc00::/7, fe80::/10 (IPv6 privées et loopback)
  if (/^127\./.test(hostname)) throw new Error(`URL loopback : ${hostname}`)
  if (/^10\./.test(hostname)) throw new Error(`URL IP privée : ${hostname}`)
  if (/^192\.168\./.test(hostname)) throw new Error(`URL IP privée : ${hostname}`)
  if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname)) throw new Error(`URL IP privée : ${hostname}`)
  if (/^169\.254\./.test(hostname)) throw new Error(`URL metadata cloud : ${hostname}`)
  if (hostname === '::1') throw new Error(`URL loopback IPv6`)
  if (/^fc[0-9a-f]{2}:/i.test(hostname)) throw new Error(`URL IPv6 privée`)
  if (/^fe[89ab][0-9a-f]:/i.test(hostname)) throw new Error(`URL IPv6 link-local`)
  // Hostname trop court (genre "a") = suspect
  if (hostname.length < 4 || !hostname.includes('.')) {
    throw new Error('Domaine invalide (trop court ou sans TLD)')
  }
  return parsed.toString()
}

function sanitizeClientContext(raw: unknown): ClientContext | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Partial<ClientContext>
  if (
    VALID_OBJECTIVES.includes(r.objective as ClientContext['objective']) &&
    VALID_TEAMS.includes(r.team_size as ClientContext['team_size']) &&
    VALID_BUDGETS.includes(r.monthly_budget as ClientContext['monthly_budget']) &&
    VALID_HORIZONS.includes(r.horizon as ClientContext['horizon'])
  ) {
    return {
      objective: r.objective as ClientContext['objective'],
      team_size: r.team_size as ClientContext['team_size'],
      monthly_budget: r.monthly_budget as ClientContext['monthly_budget'],
      horizon: r.horizon as ClientContext['horizon'],
    }
  }
  return undefined
}

export async function POST(req: Request) {
  // 1. Auth check
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  // 2. Parse body
  let body: AnalyzePayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const { url, zone, niveau_zone, langue, client_context } = body
  if (!url || !zone || !niveau_zone || !langue) {
    return NextResponse.json(
      { error: 'Champs requis : url, zone, niveau_zone, langue' },
      { status: 400 },
    )
  }
  if (!VALID_NIVEAUX.includes(niveau_zone as NiveauZone)) {
    return NextResponse.json(
      {
        error: `niveau_zone doit être l'un de : ${VALID_NIVEAUX.join(', ')}`,
      },
      { status: 400 },
    )
  }

  // 2ter. Anti-SSRF : refuse les URLs vers cibles internes/metadata.
  let sanitizedUrl: string
  try {
    sanitizedUrl = sanitizeTargetUrl(url)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'URL invalide' },
      { status: 400 },
    )
  }

  const clientContext = sanitizeClientContext(client_context)

  // 2bis. RATE LIMIT : max RATE_LIMIT_PER_DAY scans complétés ET max COST_LIMIT_PER_DAY_USD
  // dépensés dans les 24h glissantes. Le check coût protège contre un user qui consommerait
  // beaucoup avec quelques scans très lourds (ou un bug d'amplification côté pipeline).
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: recentScans } = await supabase
    .from('sparkscan_scans')
    .select('cost_usd')
    .eq('user_id', user.id)
    .in('status', ['completed', 'running'])
    .gte('created_at', since)
  const scansLast24h = recentScans?.length ?? 0
  const spentLast24h = (recentScans ?? []).reduce(
    (sum: number, s: { cost_usd: number | null }) => sum + (s.cost_usd ?? 0),
    0,
  )
  if (scansLast24h >= RATE_LIMIT_PER_DAY) {
    return NextResponse.json(
      {
        error: `Limite atteinte : ${RATE_LIMIT_PER_DAY} scans par 24h pour protéger ton budget. Réessaie demain ou contacte-nous pour augmenter ta limite.`,
      },
      { status: 429 },
    )
  }
  if (spentLast24h >= COST_LIMIT_PER_DAY_USD) {
    return NextResponse.json(
      {
        error: `Budget journalier atteint : $${spentLast24h.toFixed(2)} / $${COST_LIMIT_PER_DAY_USD} dépensés en 24h. Réessaie demain.`,
      },
      { status: 429 },
    )
  }

  // 3. Lancer l'analyse en mode async (Phase C étape 2) :
  //    - Cache hit → 200 + résultat complet immédiat
  //    - Sinon     → 202 + scan_id, le client polle GET /api/sparkscan/status
  try {
    const supabaseAdmin = getSparkScanAdminClient()
    const { scanId, cachedOutput } = await startScanInBackground({
      userId: user.id,
      url: sanitizedUrl,
      zone,
      niveauZone: niveau_zone as NiveauZone,
      langue,
      clientContext,
      supabaseAdmin,
    })
    if (cachedOutput) {
      return NextResponse.json(cachedOutput, { status: 200 })
    }
    return NextResponse.json(
      { scan_id: scanId, status: 'running' },
      { status: 202 },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json(
      { error: `Analyse échouée: ${msg}` },
      { status: 500 },
    )
  }
}
