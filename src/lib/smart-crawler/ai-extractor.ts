// Smart Crawler — AI Extraction via Claude API
// Extrait les données business structurées à partir du contenu crawlé

import type { CrawlResult, ExtractedData, DemoMode } from './types'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

const SYSTEM_PROMPT = `Tu es un expert en analyse de données commerciales. Tu reçois le contenu crawlé de plusieurs sources (site web, Facebook, Instagram, LinkedIn) pour UNE MÊME entreprise.

Ton travail : extraire et synthétiser les informations clés de cette entreprise.

RÈGLES :
- Combine les infos de TOUTES les sources disponibles. Si une info manque sur le site mais est sur Facebook, utilise Facebook.
- Si une source est vide ou a échoué, ignore-la.
- Réponds TOUJOURS en FRANÇAIS.
- Si tu ne trouves pas une info, mets une chaîne vide "".
- Pour les horaires, utilise le format : "Lun-Ven : 9h-17h, Sam : 10h-14h" etc.
- Pour la FAQ, génère 5-8 questions/réponses pertinentes basées sur ce que tu sais du business.
- Pour le secteur, utilise un terme français (Restaurant, Salon de coiffure, Garage auto, Boulangerie, Cabinet d'avocats, etc.)
- Pour les services, liste les principaux services/produits séparés par des virgules, en français.
- Pour les zones de service, identifie les zones géographiques (ville, région).
- Pour les couleurs, si tu vois des mentions de couleurs dans le contenu (logo, charte graphique, thème), note-les. Sinon mets "".

Réponds UNIQUEMENT avec du JSON valide suivant ce schéma exact :
{
  "description": "Description de l'entreprise en 2-3 phrases",
  "industry": "Catégorie du secteur",
  "services": "Liste des principaux services séparés par des virgules",
  "serviceAreas": "Zones géographiques desservies",
  "hours": "Horaires d'ouverture",
  "faq": "Q: question ?\\nR: réponse\\n\\nQ: question ?\\nR: réponse",
  "brandColors": "Couleurs dominantes si identifiées (ex: orange, noir)"
}`

function buildUserPrompt(results: CrawlResult[], companyName?: string): string {
  const sections = results.map((r) => {
    const label = r.source.toUpperCase()
    return `=== ${label} (${r.url}) ===\n${r.content}`
  })

  const name = companyName ? ` "${companyName}"` : ''

  return `Voici les données crawlées pour l'entreprise${name} :\n\n${sections.join('\n\n')}\n\nExtrais les informations structurées.`
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
      brandColors: parsed.brandColors || '',
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
