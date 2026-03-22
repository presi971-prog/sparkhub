// Smart Crawler — AI Extraction via Claude API
// Extrait les données business structurées + analyse visuelle des images

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

Réponds UNIQUEMENT avec du JSON valide suivant ce schéma exact :
{
  "description": "Description de l'entreprise en 2-3 phrases",
  "industry": "Catégorie du secteur",
  "services": "Liste des principaux services séparés par des virgules",
  "serviceAreas": "Zones géographiques desservies",
  "hours": "Horaires d'ouverture",
  "faq": "Q: question ?\\nR: réponse\\n\\nQ: question ?\\nR: réponse"
}`

const COLOR_ANALYSIS_PROMPT = `Analyse cette image (logo ou photo de profil d'une entreprise).

Identifie les 2-3 couleurs dominantes de la marque. Retourne-les en codes hexadécimaux.

Réponds UNIQUEMENT avec un JSON :
{
  "primaryColor": "#hex",
  "secondaryColor": "#hex",
  "accentColor": "#hex"
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
 * Extrait les URLs des images depuis le contenu crawlé (markdown).
 * Cherche les images Facebook (scontent), Instagram, et les URLs classiques.
 */
export function extractImageUrls(crawlResults: CrawlResult[]): string[] {
  const imageUrls: string[] = []
  const seen = new Set<string>()

  for (const result of crawlResults) {
    if (!result.success) continue

    // Chercher les URLs d'images dans le markdown
    const imgRegex = /https?:\/\/[^\s)"\]]+\.(?:jpg|jpeg|png|webp)[^\s)"\]]*/gi
    const scontentRegex = /https?:\/\/scontent[^\s)"\]]+/gi

    const matches = [
      ...(result.content.match(imgRegex) || []),
      ...(result.content.match(scontentRegex) || []),
    ]

    for (const url of matches) {
      // Nettoyer l'URL
      const cleanUrl = url.replace(/[)\]"]+$/, '')
      // Dédupliquer par nom de fichier
      const fileName = cleanUrl.split('/').pop()?.split('?')[0] || ''
      if (!seen.has(fileName) && cleanUrl.length > 30) {
        seen.add(fileName)
        imageUrls.push(cleanUrl)
      }
    }
  }

  // Retourner max 5 images uniques
  return imageUrls.slice(0, 5)
}

/**
 * Analyse les couleurs dominantes d'une image via Claude Vision.
 */
async function analyzeImageColors(imageUrl: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return ''

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        temperature: 0,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'url', url: imageUrl } },
            { type: 'text', text: COLOR_ANALYSIS_PROMPT },
          ],
        }],
      }),
    })

    if (!response.ok) {
      console.warn(`[SmartCrawler] Analyse couleurs échouée: ${response.status}`)
      return ''
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return ''

    const colors = JSON.parse(jsonMatch[0])
    return [colors.primaryColor, colors.secondaryColor, colors.accentColor]
      .filter(Boolean)
      .join(',')
  } catch (error) {
    console.warn('[SmartCrawler] Erreur analyse couleurs:', error)
    return ''
  }
}

/**
 * Envoie le contenu crawlé à Claude pour extraction structurée.
 * Analyse aussi les images pour les couleurs de la marque.
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

  // Extraire les images du contenu crawlé
  const imageUrls = extractImageUrls(successfulResults)
  console.log(`[SmartCrawler] ${imageUrls.length} images trouvées`)

  // Lancer l'extraction texte ET l'analyse couleurs en parallèle
  const userPrompt = buildUserPrompt(successfulResults, companyName)

  const [textResponse, brandColors] = await Promise.all([
    // Extraction texte
    fetch(ANTHROPIC_API_URL, {
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
    }),
    // Analyse couleurs (première image = logo/profil)
    imageUrls.length > 0 ? analyzeImageColors(imageUrls[0]) : Promise.resolve(''),
  ])

  if (!textResponse.ok) {
    const errText = await textResponse.text()
    throw new Error(`[SmartCrawler] Claude API ${textResponse.status}: ${errText}`)
  }

  const data = await textResponse.json()
  const content = data.content?.[0]?.text || ''

  // Parser le JSON
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    console.error('[SmartCrawler] Claude n\'a pas retourné de JSON:', content)
    throw new Error('[SmartCrawler] Extraction IA: pas de JSON valide')
  }

  try {
    const parsed = JSON.parse(jsonMatch[0])
    console.log(`[SmartCrawler] Couleurs marque: ${brandColors || 'non détectées'}`)
    return {
      description: parsed.description || '',
      industry: parsed.industry || '',
      services: parsed.services || '',
      serviceAreas: parsed.serviceAreas || '',
      hours: parsed.hours || '',
      faq: parsed.faq || '',
      brandColors: brandColors || '',
      logoUrl: imageUrls[0] || '',
      imageUrls: imageUrls.slice(1),
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
