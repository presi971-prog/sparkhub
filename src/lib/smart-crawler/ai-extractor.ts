// Smart Crawler — AI Extraction via Claude API
// Extrait les données business structurées à partir du contenu crawlé

import type { CrawlResult, ExtractedData, DemoMode } from './types'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

const SYSTEM_PROMPT = `You are an expert business data analyst. You receive crawled content from multiple sources (website, Facebook, Instagram, LinkedIn) for a SINGLE business.

Your job: extract and synthesize the key business information.

RULES:
- Combine information from ALL available sources. If something is missing from the website but found on Facebook, use Facebook.
- If a source is empty or failed, ignore it.
- Always respond in ENGLISH (this is for a GHL CRM system).
- If you cannot find specific information, use an empty string "".
- For hours, use format: "Mon-Fri: 9am-5pm, Sat: 10am-2pm" etc.
- For FAQ, generate 5-8 relevant Q&A pairs based on what you know about the business.
- For industry, use a generic category (Restaurant, Hair Salon, Auto Repair, Bakery, Law Firm, etc.)
- For services, list the main services/products separated by commas.
- For service areas, identify geographic areas from the content (city, region).

Respond ONLY with valid JSON matching this exact schema:
{
  "description": "2-3 sentence company description",
  "industry": "Industry category",
  "services": "Comma-separated list of main services",
  "serviceAreas": "Geographic areas served",
  "hours": "Business hours",
  "faq": "Q: question?\\nA: answer\\n\\nQ: question?\\nA: answer"
}`

function buildUserPrompt(results: CrawlResult[], companyName?: string): string {
  const sections = results.map((r) => {
    const label = r.source.toUpperCase()
    return `=== ${label} (${r.url}) ===\n${r.content}`
  })

  const name = companyName ? ` "${companyName}"` : ''

  return `Here is the crawled data for the business${name}:\n\n${sections.join('\n\n')}\n\nExtract the structured information.`
}

/**
 * Envoie le contenu crawlé à Claude pour extraction structurée.
 * Retourne les 6 champs business (description, industry, services, etc.)
 */
export async function extractBusinessData(
  crawlResults: CrawlResult[],
  companyName?: string
): Promise<ExtractedData> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('[SmartCrawler] ANTHROPIC_API_KEY manquante')
  }

  const successfulResults = crawlResults.filter((r) => r.success && r.content.length > 0)

  if (successfulResults.length === 0) {
    throw new Error('[SmartCrawler] Aucun contenu à analyser')
  }

  const userPrompt = buildUserPrompt(successfulResults, companyName)

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`[SmartCrawler] Claude API ${response.status}: ${errText}`)
  }

  const data = await response.json()
  const content = data.content?.[0]?.text || ''

  // Parser le JSON (gère les cas avec ```json ... ```)
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    console.error('[SmartCrawler] Claude n\'a pas retourné de JSON:', content)
    throw new Error('[SmartCrawler] Extraction IA: pas de JSON valide')
  }

  try {
    const parsed = JSON.parse(jsonMatch[0])
    return {
      description: parsed.description || '',
      industry: parsed.industry || '',
      services: parsed.services || '',
      serviceAreas: parsed.serviceAreas || '',
      hours: parsed.hours || '',
      faq: parsed.faq || '',
    }
  } catch {
    console.error('[SmartCrawler] JSON invalide:', jsonMatch[0])
    throw new Error('[SmartCrawler] Extraction IA: JSON malformé')
  }
}

/**
 * Détermine le mode de démo : avec site existant ou sans site (mini-site à générer).
 */
export function detectDemoMode(website?: string): DemoMode {
  if (website && website.trim().length > 0) {
    return 'with_site'
  }
  return 'without_site'
}
