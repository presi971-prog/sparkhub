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
  const crawlPromises = await Promise.allSettled([
    crawlWebsite(website),
    crawlFacebook(facebook_url),
    crawlInstagram(instagram_url),
    crawlLinkedin(linkedin_url),
  ])

  // Collecter les résultats réussis
  const results: CrawlResult[] = crawlPromises
    .filter((p): p is PromiseFulfilledResult<CrawlResult> => p.status === 'fulfilled')
    .map((p) => p.value)

  const successfulResults = results.filter((r) => r.success && r.content.length > 0)

  console.log(`[SmartCrawler] Crawl terminé: ${successfulResults.length}/${results.length} sources réussies`)

  if (successfulResults.length === 0) {
    console.error(`[SmartCrawler] Aucune source crawlée pour contact ${contactId}. Abandon.`)
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

  // 6. Écrire dans GHL
  const fields = [
    { id: FIELD_IDS.description, field_value: extracted.description },
    { id: FIELD_IDS.industry, field_value: extracted.industry },
    { id: FIELD_IDS.services, field_value: extracted.services },
    { id: FIELD_IDS.serviceAreas, field_value: extracted.serviceAreas },
    { id: FIELD_IDS.hours, field_value: extracted.hours },
    { id: FIELD_IDS.faq, field_value: extracted.faq },
  ]

  const success = await updateContactFields(contactId, pit, fields)

  const duration = Date.now() - startTime
  if (success) {
    console.log(`[SmartCrawler] ✅ Contact ${contactId} mis à jour (${fields.length} champs) en ${duration}ms`)
  } else {
    console.error(`[SmartCrawler] ❌ Échec écriture GHL pour contact ${contactId} après ${duration}ms`)
  }
}
