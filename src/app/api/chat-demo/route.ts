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
// =============================================================================

import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url') || ''
  const loc = searchParams.get('loc') || ''

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DCG AI — Chat Demo Relay</title>
  <style>
    html, body { margin: 0; padding: 0; background: transparent; }
  </style>
</head>
<body>
  <script>
    // DCG AI Chat Demo Relay
    // Site: ${url}
    // Loc:  ${loc}
    // Loaded at: ${new Date().toISOString()}
    // Status: subscription always granted (no third-party check)
    console.log('DCG AI chat demo relay loaded — no subscription error sent.');
  </script>
</body>
</html>`

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Frame-Options': 'ALLOWALL',
      'Content-Security-Policy': "frame-ancestors *",
    },
  })
}
