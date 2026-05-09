// =============================================================================
// DCG AI — Chat Demo Relay
// =============================================================================
//
// CONTEXTE
// --------
// La page de démo DCG AI hébergée dans GHL (funnel "01a. AI Demo (Dynamic) TM",
// étape "Chat Demo Embed (Do NOT Touch)") chargeait à l'origine un iframe vers
// `https://n8n.clikit.us/webhook/chat-demo` — un workflow n8n hébergé chez Pat
// Friedl (Local Biz Domination, BotMockups/TurboMock).
//
// Ce workflow vérifiait si l'abonnement BotMockups DCG AI était actif. En cas
// d'inactivité, il envoyait via postMessage `{type:'subscriptionError'}` au
// parent, ce qui supprimait le widget chat GHL et affichait
// "Oops! No active subscription found." côté prospect.
//
// PROBLÈME (05/05/2026)
// ---------------------
// Thierry a résilié l'abonnement BotMockups dans la journée du 05/05/2026.
// Conséquence : tout prospect arrivant sur la page de démo voyait l'erreur,
// ce qui détruisait l'image de marque de DCG AI et bloquait la campagne
// Meta Ads en cours.
//
// SOLUTION
// --------
// Cet endpoint REMPLACE l'iframe `n8n.clikit.us/webhook/chat-demo` par un
// endpoint sous le contrôle de DCG AI (sparkhub.digital-code-growth.com),
// SANS dépendance à un service tiers.
//
// Le rôle de l'endpoint est volontairement minimaliste : retourner une page
// HTML quasi vide qui n'envoie JAMAIS `postMessage({type:'subscriptionError'})`.
// Le widget chat GHL natif (Myra Chat, configuré en Auto-Pilot) reste affiché
// et fonctionne normalement, piloté par le code JS de Pat (qui reste dans le
// funnel — il s'occupe de l'auto-fill nom/email et du choix Chat/Voice).
//
// CONFIGURATION CÔTÉ FUNNEL GHL
// -----------------------------
// Dans le funnel `01a. AI Demo (Dynamic) TM`, étape `Chat Demo Embed (Do NOT
// Touch)`, bloc 2 (HTML/JavaScript personnalisé), il faut remplacer la ligne :
//
//   e.src="https://n8n.clikit.us/webhook/chat-demo"
//
// par :
//
//   e.src="https://sparkhub.digital-code-growth.com/api/chat-demo"
//
// (le reste du code Pat reste identique, y compris l'ajout des paramètres
// ?t=...&url=...&loc=...).
//
// PARAMÈTRES REÇUS (depuis le code Pat)
// -------------------------------------
// - `t`   : timestamp anti-cache
// - `url` : URL du site web du prospect (pour personnalisation potentielle future)
// - `loc` : identifiant interne v2_history_<loc> du widget chat GHL
//
// LIMITES CONNUES
// ---------------
// L'endpoint est minimaliste. Si le workflow n8n original de Pat faisait plus
// que vérifier la subscription (par exemple injecter du contexte business
// dans Myra Chat avant l'ouverture du chat), ces fonctionnalités ne sont
// PAS reproduites ici. Test en conditions réelles requis.
//
// DOC PROJET
// ----------
// - Mémoire bug : ~/.claude/projects/.../memory/dcg-ai-bug-no-active-subscription-funnel-premium.md
// - Mémoire Smart Crawler : ~/.claude/projects/.../memory/smart-crawler.md
// - Code source frontend : funnel GHL `01a. AI Demo (Dynamic) TM`
//   - Étape "Chat Demo" — bloc 3 (script Pat) charge `${origin}/chat-demo-frame`
//   - Étape "Chat Demo Embed (Do NOT Touch)" — bloc 2 (script Pat) charge
//     `n8n.clikit.us/webhook/chat-demo` (à remplacer par cet endpoint)
//
// HISTORIQUE
// ----------
// 07/05/2026 — Création initiale après bug du 05/05/2026.
// 07/05/2026 v2 — Ajout affichage du site prospect via screenshot Microlink.
// 07/05/2026 v3 — Si l'URL passée est sociale (FB/IG/LI), lookup GHL par email
//                 pour récupérer le mini-site URL généré par Smart Crawler
//                 (le trigger link a figé l'URL sociale, mais Smart Crawler
//                 a remplacé contact.website par l'URL du mini-site DCG AI
//                 entre temps — on doit utiliser cette dernière, sinon
//                 l'iframe affiche la page de login Facebook/Instagram).
// =============================================================================

import { NextRequest } from 'next/server'

export const runtime = 'edge'

const GHL_API_BASE = 'https://services.leadconnectorhq.com'
const GHL_LOCATION_ID = '15W1kS8V6KqgTPhtzaPZ' // sub-account DCG AI

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function isHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s)
}

function isSocialUrl(s: string): boolean {
  return /facebook\.com|fb\.com|fb\.me|instagram\.com|linkedin\.com|lnkd\.in/i.test(s)
}

/**
 * Look up a GHL contact by email and return its current `website` field.
 * Used when the URL passed to the iframe is a social URL (FB/IG/LI) — in
 * that case Smart Crawler has generated a mini-site and written it to
 * contact.website, but the trigger link froze the URL with the social URL.
 * This lookup gets the up-to-date mini-site URL.
 */
async function fetchContactWebsite(email: string): Promise<string | null> {
  const pit = process.env.GHL_PIT_TOKEN
  if (!pit) {
    console.warn('[chat-demo] GHL_PIT_TOKEN missing — cannot lookup contact')
    return null
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
      console.warn(`[chat-demo] GHL lookup ${res.status} for ${email}`)
      return null
    }
    const data = (await res.json()) as { contacts?: Array<{ website?: string; email?: string }> }
    const list = data.contacts || []
    const match = list.find((c) => c.email?.toLowerCase() === email.toLowerCase()) || list[0]
    return match?.website || null
  } catch (e) {
    console.warn('[chat-demo] GHL lookup error:', e)
    return null
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url') || ''
  const email = searchParams.get('email') || ''
  const loc = searchParams.get('loc') || ''

  let cleanUrl = isHttpUrl(url) ? url : ''

  // Si l'URL passée est sociale (Facebook/Instagram/LinkedIn), on essaie de
  // récupérer la valeur à jour de contact.website (le mini-site DCG AI que
  // Smart Crawler a généré). Sinon on continue avec l'URL d'origine.
  if (cleanUrl && isSocialUrl(cleanUrl) && email) {
    const fresh = await fetchContactWebsite(email)
    if (fresh && isHttpUrl(fresh) && !isSocialUrl(fresh)) {
      console.log(`[chat-demo] URL sociale (${cleanUrl}) remplacée par mini-site (${fresh}) via lookup contact`)
      cleanUrl = fresh
    }
  }

  const safeUrl = escapeHtml(cleanUrl)

  // Microlink renders a screenshot of the prospect's site (no X-Frame-Options issue).
  // Free tier: 50 req/day per IP. For higher volume, add MICROLINK_API_KEY.
  // force=true bypasse le cache Microlink — sinon les modifs récentes du
  // mini-site DCG AI ne sont pas reflétées dans le screenshot affiché au
  // prospect (Microlink cache plusieurs heures).
  const screenshotUrl = cleanUrl
    ? `https://api.microlink.io/?url=${encodeURIComponent(cleanUrl)}&screenshot=true&meta=false&embed=screenshot.url&viewport.width=375&viewport.height=812&viewport.deviceScaleFactor=2&waitFor=3000&force=true`
    : ''

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DCG AI — Chat Demo Relay</title>
  <style>
    html, body { margin: 0; padding: 0; height: 100%; background: #f4f4f4; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .site-shot { display: block; width: 100%; height: 100%; object-fit: cover; object-position: top; border: 0; background: #f4f4f4; }
    .placeholder { display: flex; align-items: center; justify-content: center; height: 100%; color: #888; font-size: 14px; padding: 24px; text-align: center; }
  </style>
</head>
<body>
  ${
    screenshotUrl
      ? `<img class="site-shot" src="${escapeHtml(screenshotUrl)}" alt="Aperçu de ${safeUrl}" onerror="this.style.display='none'; document.getElementById('fallback').style.display='flex';" />
  <div id="fallback" class="placeholder" style="display:none;">Aperçu du site indisponible — votre démo continue normalement.</div>`
      : `<div class="placeholder">Démo en cours — votre assistante IA répond dans la fenêtre de chat.</div>`
  }
  <script>
    // DCG AI Chat Demo Relay v2
    // Site: ${safeUrl || '(none)'}
    // Loc:  ${escapeHtml(loc)}
    // Loaded at: ${new Date().toISOString()}
    // Status: subscription always granted (no third-party check). Site shown via Microlink screenshot.
    console.log('DCG AI chat demo relay v2 loaded.');
  </script>
</body>
</html>`

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Frame-Options': 'ALLOWALL',
      'Content-Security-Policy': "frame-ancestors *; img-src 'self' https:; default-src 'self' 'unsafe-inline'",
    },
  })
}
