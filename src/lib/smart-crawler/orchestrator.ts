// Smart Crawler — Orchestrator
// Coordonne : crawl parallèle → extraction IA → écriture GHL

import { crawlWebsite } from './crawlers/web-crawler'
import { crawlFacebook } from './crawlers/facebook-crawler'
import { crawlInstagram } from './crawlers/instagram-crawler'
import { crawlLinkedin } from './crawlers/linkedin-crawler'
import { extractBusinessData, detectDemoMode } from './ai-extractor'
import { generateMiniSiteUrl } from './mini-site-generator'
import { updateContactFields } from './ghl-client'
import type { WebhookPayload, CrawlResult } from './types'

// IDs des custom fields GHL — à configurer dans les env vars
// Ces IDs sont visibles dans GHL > Settings > Custom Fields
// IDs internes des custom fields GHL (trouvés via l'API contacts)
const FIELD_IDS = {
  description: 'SinwSUnXHLkzYZfeiiAt',
  industry: 'n8OA1p2bKpGPoR0LLBVa',
  services: 'fa2a2U0TfblbWHBhUD1D',
  serviceAreas: 'wPG567tRa4nL6NhXUgSb',
  hours: '8FTympBEanG4WErZgJSO',
  faq: 'eyTCI2cknifRwOKELlxs',
  hasChat: 'CRYCGS8LJIq6qfsp6Scd',
}

/**
 * Processus principal : crawl → extract → write-back.
 * Appelé de manière asynchrone après la réponse 200 du webhook.
 */
export async function crawlAndExtract(payload: WebhookPayload): Promise<void> {
  const startTime = Date.now()
  const { contactId, pit, website, facebook_url, instagram_url, linkedin_url, company_name } = payload

  console.log(`[SmartCrawler] Démarrage pour contact ${contactId}`)
  console.log(`[SmartCrawler] Sources: web=${!!website} fb=${!!facebook_url} ig=${!!instagram_url} li=${!!linkedin_url}`)

  // 1. Crawl toutes les sources EN PARALLÈLE
  // Note : crawlFacebook + crawlInstagram reçoivent contactId pour persister
  // les images sur Supabase Storage (URLs CDN FB/Insta expirent en quelques
  // heures). Sans contactId, on garderait des URLs éphémères qui cassent.
  const crawlPromises = await Promise.allSettled([
    crawlWebsite(website, contactId),
    crawlFacebook(facebook_url, contactId),
    crawlInstagram(instagram_url, contactId),
    crawlLinkedin(linkedin_url, contactId),
  ])

  // Collecter les résultats réussis
  const results: CrawlResult[] = crawlPromises
    .filter((p): p is PromiseFulfilledResult<CrawlResult> => p.status === 'fulfilled')
    .map((p) => p.value)

  const successfulResults = results.filter((r) => r.success && r.content.length > 0)

  console.log(`[SmartCrawler] Crawl terminé: ${successfulResults.length}/${results.length} sources réussies`)

  if (successfulResults.length === 0) {
    console.error(`[SmartCrawler] Aucune source crawlée pour contact ${contactId}. Marquage en échec → rappel manuel.`)
    await markContactAsCrawlerFailed(contactId, pit, payload.email)
    return
  }

  // Log les sources réussies
  for (const r of successfulResults) {
    console.log(`[SmartCrawler]   ✓ ${r.source}: ${r.content.length} chars`)
  }

  // Log les échecs
  for (const r of results.filter((r) => !r.success && r.url)) {
    console.warn(`[SmartCrawler]   ✗ ${r.source}: ${r.error}`)
  }

  // 2. Extraction IA via Claude
  let extracted
  try {
    extracted = await extractBusinessData(successfulResults, company_name)
    console.log(`[SmartCrawler] Extraction OK: industry="${extracted.industry}", services="${extracted.services.slice(0, 80)}..."`)
  } catch (error) {
    console.error(`[SmartCrawler] Extraction IA échouée:`, error)
    await markContactAsCrawlerFailed(contactId, pit, payload.email)
    return
  }

  // 3. Détecter le mode de démo
  const demoMode = detectDemoMode(website)
  console.log(`[SmartCrawler] Mode démo: ${demoMode}`)

  // 4. Générer un mini-site si pas de site web
  let miniSiteUrl = ''
  if (demoMode === 'without_site') {
    miniSiteUrl = generateMiniSiteUrl(contactId, company_name || '', extracted)
    console.log(`[SmartCrawler] Mini-site généré: ${miniSiteUrl}`)
  }

  // 5. Générer un memory key unique
  const memoryKey = crypto.randomUUID()

  // 6. Écrire dans GHL — custom fields
  const hasChatValue = extracted.hasChat ? 'HAS CHAT' : 'NO CHAT'
  console.log(`[SmartCrawler] Chat détecté: ${hasChatValue}`)

  const fields = [
    { id: FIELD_IDS.description, field_value: extracted.description },
    { id: FIELD_IDS.industry, field_value: extracted.industry },
    { id: FIELD_IDS.services, field_value: extracted.services },
    { id: FIELD_IDS.serviceAreas, field_value: extracted.serviceAreas },
    { id: FIELD_IDS.hours, field_value: extracted.hours },
    { id: FIELD_IDS.faq, field_value: extracted.faq },
    { id: FIELD_IDS.hasChat, field_value: hasChatValue },
  ]

  // 6. Écriture ATOMIQUE en UN SEUL PUT : companyName + Custom Fields AI Demo
  //    en même temps. Avantage : la page funnel "Demo Opt-In Checker (Do NOT Touch)"
  //    qui surveille les Custom Fields ne pourra jamais voir un état intermédiaire
  //    où les Custom Fields sont remplis mais companyName est encore vide.
  //    Avant ce fix, on avait 2 PUT séparés (companyName puis customFields), ce
  //    qui pouvait produire ?company=undefined dans l'URL de redirection vers
  //    /chat-demo dans 1-5% des cas selon timing GHL.
  if (!extracted.businessName) {
    console.warn(`[SmartCrawler] businessName non extrait pour contact ${contactId} — {{company}} restera vide.`)
  }
  const success = await updateContactFields(contactId, pit, fields, extracted.businessName)

  // 7. Si pas de site web → écrire l'URL du mini-site dans le champ website du contact
  //    pour que la page démo DemoDrop affiche le mini-site au lieu d'une erreur
  if (demoMode === 'without_site' && miniSiteUrl) {
    const websiteUpdate = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${pit}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ website: miniSiteUrl }),
    })
    if (websiteUpdate.ok) {
      console.log(`[SmartCrawler] Website mis à jour avec mini-site: ${miniSiteUrl}`)
    } else {
      console.error(`[SmartCrawler] Échec mise à jour website: ${websiteUpdate.status}`)
    }

    // 7b. Stocker le mapping + assets visuels (couleurs, logo, hero) dans Supabase
    //     Le mini-site /demo-site/{slug} les lit depuis cette table.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wytvwfgamfaoqmvoqzps.supabase.co'
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    if (supabaseKey) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/demo_site_mapping`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates',
          },
          body: JSON.stringify({
            slug: contactId.toLowerCase(),
            contact_id: contactId,
            brand_colors: extracted.brandColors,
            logo_url: extracted.logoUrl || null,
            hero_image_url: extracted.heroImageUrl || null,
          }),
        })
        console.log(`[SmartCrawler] Mapping Supabase: ${contactId.toLowerCase()} → ${contactId} (logo=${!!extracted.logoUrl}, hero=${!!extracted.heroImageUrl}, colors=${!!extracted.brandColors})`)
      } catch (e) {
        console.error(`[SmartCrawler] Échec mapping Supabase:`, e)
      }
    }
  }

  const duration = Date.now() - startTime
  if (success) {
    console.log(`[SmartCrawler] ✅ Contact ${contactId} mis à jour (${fields.length} champs) en ${duration}ms`)
  } else {
    console.error(`[SmartCrawler] ❌ Échec écriture GHL pour contact ${contactId} après ${duration}ms`)
  }
}

/**
 * Marque un contact comme "Smart Crawler en échec".
 * Ajoute un tag GHL `smart-crawler-failed` qui déclenche un workflow GHL de rappel manuel,
 * et écrit un companyName fallback dérivé du domaine de l'email (si non générique).
 */
async function markContactAsCrawlerFailed(
  contactId: string,
  pit: string,
  email?: string,
): Promise<void> {
  // 1. Calculer un companyName fallback depuis le domaine de l'email.
  //    Ex: "jimmy@jimmytraiteur.com" → "Jimmytraiteur"
  //    Pour les emails génériques (gmail, hotmail, etc.) → "À rappeler"
  const GENERIC_DOMAINS = [
    'gmail', 'hotmail', 'yahoo', 'outlook', 'free', 'sfr', 'orange',
    'wanadoo', 'laposte', 'live', 'msn', 'icloud', 'me', 'protonmail',
  ]
  let fallbackName = 'À rappeler'
  if (email) {
    const domain = email.split('@')[1]?.split('.')[0]
    if (domain && !GENERIC_DOMAINS.includes(domain.toLowerCase())) {
      fallbackName = domain
        .replace(/[-_]/g, ' ')
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ')
    }
  }

  // 2. Écrire le companyName fallback sur le contact GHL
  try {
    await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${pit}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ companyName: fallbackName }),
    })
    console.log(`[SmartCrawler] companyName fallback écrit: "${fallbackName}"`)
  } catch (e) {
    console.error(`[SmartCrawler] Erreur PUT companyName fallback:`, e)
  }

  // 3. Supprimer puis ré-ajouter le tag `smart-crawler-failed`
  //    pour forcer le déclenchement du workflow GHL même si le tag existait déjà
  //    (sinon GHL n'émet pas l'event Tag Added si le tag est déjà présent).
  try {
    await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}/tags`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${pit}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tags: ['smart-crawler-failed'] }),
    })
  } catch (_) {
    // Tag peut ne pas exister, on ignore silencieusement
  }

  try {
    const r = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}/tags`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pit}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tags: ['smart-crawler-failed'] }),
    })
    if (r.ok) {
      console.log(`[SmartCrawler] Tag 'smart-crawler-failed' ajouté au contact ${contactId}`)
    } else {
      console.error(`[SmartCrawler] Erreur ajout tag: ${r.status} ${await r.text().catch(() => '')}`)
    }
  } catch (e) {
    console.error(`[SmartCrawler] Erreur ajout tag smart-crawler-failed:`, e)
  }
}
