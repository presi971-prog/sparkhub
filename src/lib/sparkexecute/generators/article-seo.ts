/**
 * SparkExecute — générateur d'article SEO (Markdown + image hero).
 *
 * Pourquoi : c'est le livrable n°1 de l'atelier. Sert à ranker sur Google
 * (GEO, E-E-A-T, Pillar+Cluster), génère du trafic qualifié, alimente le
 * mini-site DCG AI et nourrit les posts LinkedIn dérivés.
 *
 * Sortie : Markdown avec H1 unique, H2/H3 hiérarchisés, paragraphes courts,
 * bloc JSON-LD Schema Article en pied d'article + IMAGE HERO 16:9 générée
 * automatiquement via Nano Banana (kie.ai) et hébergée dans notre bucket.
 *
 * Pack complet (V1.2) :
 *   1. Claude produit le prompt image hero (anglais) + le Markdown de l'article.
 *   2. Nano Banana génère l'image hero paysage 16:9 (1600×900 cible).
 *   3. L'image est uploadée dans le bucket Storage SparkExecute.
 *   4. L'URL publique est renvoyée dans output.image_url, prête à être consommée
 *      par le publisher GHL Blog (champ `imageUrl` côté payload).
 *
 * Fallback gracieux : si Nano Banana échoue (kie.ai down, crédits, timeout),
 * l'article texte est livré quand même avec un `image_error` soft. Le run reste
 * en `draft`, l'utilisateur peut publier sans hero (GHL accepte un article sans
 * imageUrl) ou en ajouter une manuellement depuis l'UI GHL.
 *
 * R0 critique GHL Blog : on ne met JAMAIS de balise `<img>` au début du Markdown
 * pour le hero — l'image est passée UNIQUEMENT via `output.image_url` puis le
 * champ `imageUrl` du payload GHL. Cf. mémoire r0-ghl-blog-pas-de-hero-dans-rawhtml.md.
 *
 * Modèle utilisé : Claude Sonnet 4.6 (cf. claude-text.ts).
 */

import { callClaudeText } from '../claude-text'
import { resolveBrandProfile, buildR0ZeroInvention } from '../brand'
import {
  generateAndStoreImage,
  NANO_BANANA_PRO_USD_PER_IMAGE,
} from './image-pipeline'
import type { RunInputBrief, RunOutput } from '../types'
import type { SparkpilotTask } from '@/lib/sparkpilot/types'

/** Bornes de longueur (en mots) : clamp si l'user demande un truc absurde. */
const MIN_WORDS = 800
const MAX_WORDS = 2000
const DEFAULT_WORDS = 1200

/** Framework par défaut pour ce type (utilisé si la tâche n'en cite pas). */
const DEFAULT_FRAMEWORK = 'Pillar+Cluster'

/** Format d'image hero (paysage éditorial standard blog + Open Graph). */
const HERO_ASPECT_RATIO = '16:9' as const
const HERO_WIDTH = 1600
const HERO_HEIGHT = 900

/**
 * Génère un article SEO (markdown + image hero) à partir d'un brief et d'une
 * tâche SparkPilot optionnelle.
 *
 * @param brief Brief utilisateur (sujet, audience, ton, mots-clés…).
 * @param task  Tâche SparkPilot d'origine (optionnelle). Si fournie, enrichit
 *              le brief avec le framework cité, la description et le contexte.
 */
export async function generateArticleSeo(
  brief: RunInputBrief,
  task?: SparkpilotTask | null,
): Promise<{ output: RunOutput; cost: { usd: number; inputTokens: number; outputTokens: number }; frameworkUsed: string }> {
  const framework =
    brief.framework_override ?? task?.metadata?.framework_used ?? DEFAULT_FRAMEWORK

  const targetWords = clampWords(brief.longueur_souhaitee ?? DEFAULT_WORDS)
  const prompt = buildPrompt(brief, framework, targetWords, task)

  const result = await callClaudeText({
    prompt,
    // ~1.5 tokens / mot français + marge pour le Schema markup + le prompt image
    // hero en anglais (3-6 lignes). On ajoute ~300 tokens vs V1 pour le bloc image.
    maxTokens: Math.min(8000, Math.round(targetWords * 2.2) + 300),
    label: 'sparkexecute-article-seo',
  })

  // Petit nettoyage : Claude met parfois ```markdown ... ``` autour du gros bloc.
  const rawText = result.text
    .replace(/^```(?:markdown|md)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  // Sépare le prompt image hero et le markdown de l'article.
  const { imagePrompt, markdown } = splitHeroPromptAndMarkdown(rawText)

  // Statistiques rapides pour l'affichage UI (lisibilité, structure).
  const wordCount = countWords(markdown)
  const h2Count = (markdown.match(/^##\s+/gm) ?? []).length
  const schemaJsonld = extractSchemaJsonLd(markdown)

  // ============================================================
  // Étape 2 : génération de l'image hero (best-effort, fallback gracieux).
  // Si Nano Banana échoue, l'article texte reste publiable.
  // ============================================================
  const altText = buildAltText(brief.sujet)
  let imageUrl: string | undefined
  let imageError: string | undefined
  let imageCostUsd = 0

  if (imagePrompt && imagePrompt.length > 0) {
    try {
      imageUrl = await generateAndStoreImage(imagePrompt, HERO_ASPECT_RATIO)
      imageCostUsd = NANO_BANANA_PRO_USD_PER_IMAGE
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      imageError =
        "Image hero non générée — l'article reste publiable, tu peux en ajouter une via GHL. " +
        `(détail : ${msg})`
      console.warn('[SparkExecute] article-seo hero image generation failed:', msg)
    }
  } else {
    imageError =
      "Image hero non générée — l'article reste publiable, tu peux en ajouter une via GHL. " +
      '(détail : Claude n\'a pas renvoyé de bloc HERO_IMAGE_PROMPT)'
  }

  return {
    output: {
      content: markdown,
      image_url: imageUrl,
      alt_text: imageUrl ? altText : undefined,
      image_error: imageError,
      metadata: {
        word_count: wordCount,
        h2_count: h2Count,
        schema_jsonld: schemaJsonld,
        framework_used: framework,
        target_words: targetWords,
        image_prompt: imagePrompt,
        hero_aspect_ratio: HERO_ASPECT_RATIO,
        hero_width: HERO_WIDTH,
        hero_height: HERO_HEIGHT,
      },
    },
    cost: {
      usd: result.costUsd + imageCostUsd,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    },
    frameworkUsed: framework,
  }
}

// ============================================================
// Helpers
// ============================================================

function buildPrompt(
  brief: RunInputBrief,
  framework: string,
  targetWords: number,
  task?: SparkpilotTask | null,
): string {
  const brand = resolveBrandProfile(brief.brand)
  const audience = brief.audience?.trim() || brand.audienceDefault
  const ton = brief.ton?.trim() || 'professionnel mais accessible (tutoiement)'
  const motsCles = (brief.mots_cles ?? []).filter((m) => m && m.trim()).slice(0, 12)
  const variant = describeVariant(brief.variant)
  // Date du jour réelle (côté serveur) injectée dans le Schema — évite que le
  // modèle invente une date erronée depuis sa date de connaissance.
  const todayIso = new Date().toISOString().slice(0, 10)

  const taskContext = task
    ? `[CONTEXTE DE LA TÂCHE PARENTE SPARKPILOT]
Cet article a été demandé pour avancer la tâche suivante :
- Titre : ${task.title}
- Description : ${task.description ?? '(pas de description)'}
- Priorité stratégique : ${task.priority_index}
- Framework cité par SparkPilot : ${task.metadata?.framework_used ?? '(non précisé)'}

Garde ce contexte en tête pour rédiger un article qui colle au plan d'action de l'utilisateur.

`
    : ''

  return `[RÔLE]
Tu es le rédacteur SEO senior qui écrit AU NOM DE ${brand.name}
(${brand.domain}). Public visé : ${audience}.
Tu rédiges un article optimisé pour ranker sur Google ET tu fournis le prompt
d'une image hero éditoriale qui accompagne l'article sur le blog.

⚠️ "SparkExecute", "SparkScan", "SparkPilot" et "SparkHub" sont des noms
d'OUTILS INTERNES. Ils ne doivent JAMAIS apparaître dans l'article ni dans le
Schema. La SEULE marque visible par le lecteur est ${brand.name}.

[R0 ABSOLUES — NE PAS DÉROGER]

${buildR0ZeroInvention(brand)}
- Tu PEUX décrire un scénario générique explicitement hypothétique tant que tu
  ne le présentes pas comme un fait réel ni un témoignage authentique.
- Le CTA final invite à la conversion via ce lien réel (le SEUL autorisé),
  formaté en lien Markdown cliquable — par ex. :
  "👉 [${brand.ctaLabel}](${brand.ctaUrl})".
  N'invente JAMAIS d'autre URL ni de "#". Jamais "SparkExecute" dans le CTA.

${brand.anchoringRules}

R0 #2 — STRUCTURE SEO STRICTE
- Un SEUL H1 en tête (le titre principal). Pas de H1 dans le corps.
- 4 à 8 H2 minimum pour structurer (un par section logique).
- H3 sous certains H2 si la section a plusieurs sous-points.
- Paragraphes COURTS : 2 à 4 lignes maximum (lisibilité mobile + SEO).
- Listes à puces (-) ou numérotées (1.) dès qu'il y a 3+ items.
- 1 ou 2 mises en exergue en blockquote (> ...) pour rythmer la lecture : une
  idée forte ou un conseil clé — JAMAIS un faux témoignage client (cf. R0 #0).
- INTERDIT ABSOLU : NE JAMAIS insérer une balise <img> ni un Markdown image
  ![...](...) au DÉBUT de l'article. L'image hero est gérée séparément par
  le système de publication, l'insérer dans le markdown créerait un doublon
  visuel sur le blog.

R0 #3 — MOTS-CLÉS NATURELS, JAMAIS DE STUFFING
${
  motsCles.length > 0
    ? `Mots-clés cibles à intégrer NATURELLEMENT (1 à 3 occurrences chacun, jamais bourrer) :
${motsCles.map((m) => `  - "${m}"`).join('\n')}`
    : `Pas de mot-clé imposé. Trouve toi-même 3-5 expressions naturelles autour du sujet.`
}

R0 #4 — SCHEMA.ORG ARTICLE EN FIN
Ajoute en TOUT DERNIER, après le contenu, un bloc Schema.org JSON-LD :

\`\`\`json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "<titre exact>",
  "description": "<résumé 2 phrases>",
  "author": { "@type": "Organization", "name": "${brand.name}" },
  "publisher": { "@type": "Organization", "name": "${brand.name}", "url": "${brand.domain}" },
  "datePublished": "${todayIso}",
  "inLanguage": "fr-FR",
  "areaServed": { "@type": "Place", "name": "${brand.areaServed}" }
}
\`\`\`

Le bloc JSON-LD doit être à l'intérieur d'un bloc de code fenced (\`\`\`json … \`\`\`).

R0 #5 — TON ET CIBLE
- Audience : ${audience}
- Ton : ${ton}
- Écris POUR cette audience précise : zéro jargon inutile, et tout terme
  technique est expliqué immédiatement s'il est indispensable.
- Verbes d'action concrets ; quand c'est pertinent et VÉRIFIABLE, exemples
  chiffrés (sans jamais inventer, cf. R0 #0).

R0 #6 — FRAMEWORK GUIDE : ${framework}
Applique les principes du framework "${framework}" pour structurer l'article :
${frameworkGuidance(framework)}

[BRIEF]
- Sujet de l'article : ${brief.sujet}
- Longueur visée : ${targetWords} mots (à ±15 %)
${variant ? `- Variante demandée : ${variant}` : ''}

${taskContext}[FORMAT DE RÉPONSE — DEUX BLOCS OBLIGATOIRES]

Tu dois renvoyer EXACTEMENT deux blocs dans cet ordre :

BLOC 1 — PROMPT IMAGE HERO (en TÊTE de ta réponse) :
Encadre le prompt entre deux balises exactes, sur leur propre ligne :
---HERO_IMAGE_PROMPT---
[le prompt anglais ici, 3 à 6 lignes]
---END_HERO_IMAGE_PROMPT---

Spécifications du prompt image hero :
- Langue : ANGLAIS uniquement (Nano Banana est plus précis en anglais).
- Format : 3 à 6 lignes, style "Professional editorial photograph,
  hyperrealistic, landscape 16:9 composition (1600×900).
  Subject: ... Setting: ... Light: ...".
- L'image doit ILLUSTRER concrètement le sujet de l'article par une scène
  réaliste et crédible, cohérente avec l'audience (${audience}).
- UNIVERS VISUEL IMPOSÉ (à respecter strictement) : ${brand.imageStyle}
- INTERDITS ABSOLUS : tout détail incohérent avec l'univers ci-dessus,
  texte / logo / watermark incrusté dans l'image, captures d'écran d'UI.
- Style éditorial : photoréaliste, profondeur de champ courte, qualité
  magazine, color grading soigné.

BLOC 2 — MARKDOWN DE L'ARTICLE (juste après la balise de fin) :
Commence par # (le H1) directement, sans intro du genre "Voici l'article :",
sans conclusion meta du genre "J'espère que cet article…". Juste le Markdown
brut de l'article, du H1 au bloc JSON-LD final.

EXEMPLE DE STRUCTURE DE RÉPONSE (adapte le contenu à l'univers visuel imposé) :
---HERO_IMAGE_PROMPT---
Professional editorial photograph, hyperrealistic, landscape 16:9 composition (1600×900).
Subject: <a realistic scene illustrating the article topic, consistent with the
imposed brand universe above>. Setting: <coherent with that universe>. Light:
<natural, editorial>. Tone: editorial, accessible, modern. No text overlay, no logo.
---END_HERO_IMAGE_PROMPT---
# Titre H1 de l'article
[paragraphes, H2, H3, listes, blockquote, bloc JSON-LD à la fin…]`
}

/**
 * Guidance courte par framework. Volontairement compact pour ne pas exploser
 * la taille du prompt. À enrichir au fil des versions.
 */
function frameworkGuidance(framework: string): string {
  const fw = framework.toLowerCase()
  if (fw.includes('pillar') || fw.includes('cluster')) {
    return `Article "pillar" = couvre le sujet en LARGEUR, fait office de page de référence.
Liste explicitement (via H2) tous les sous-sujets traités. Mentionne les
sujets adjacents qu'on traitera dans des articles "cluster" liés.`
  }
  if (fw.includes('skyscraper')) {
    return `Skyscraper = on dépasse en profondeur tout ce qui existe déjà sur Google
sur ce sujet. Donne plus d'exemples concrets, plus d'angles, plus de
sous-sections. Va au-delà du best-of pour devenir LA référence. (Ne JAMAIS
inventer de chiffres ou de sources pour "faire sérieux" — cf. R0 #0.)`
  }
  if (fw.includes('geo')) {
    return `GEO (Generative Engine Optimization) = rédige pour être cité par ChatGPT,
Perplexity, Gemini. Phrases courtes, faits vérifiables uniquement, pas de
source inventée, questions-réponses intégrées dans le texte. N'invente JAMAIS
de nom d'entreprise réel ni de statistique (cf. R0 #0).`
  }
  if (fw.includes('e-e-a-t') || fw.includes('eeat')) {
    return `E-E-A-T = Experience, Expertise, Authoritativeness, Trust. Montre que
l'auteur maîtrise le sujet (vocabulaire métier juste, conseils actionnables).
Appuie-toi sur des faits vérifiables uniquement — sans inventer de témoignage
ni de statistique (cf. R0 #0).`
  }
  if (fw.includes('topical')) {
    return `Topical Authority = montre que tu maîtrises TOUT le champ sémantique du
sujet. Cite les sous-thèmes connexes, les définitions, les acteurs majeurs.`
  }
  return `Structure l'article de façon claire et logique, avec un fil conducteur fort.`
}

function describeVariant(variant: RunInputBrief['variant']): string {
  switch (variant) {
    case 'shorter':
      return 'Version PLUS COURTE et plus dense (vise -25 % de longueur).'
    case 'punchier':
      return 'Ton PLUS DIRECT, accroches plus tape-à-l\'œil, phrases plus brèves.'
    case 'pro':
      return 'Ton PLUS INSTITUTIONNEL, vouvoiement, vocabulaire métier appuyé.'
    case 'casual':
      return 'Ton PLUS DÉTENDU, tutoiement marqué, exemples du quotidien.'
    default:
      return ''
  }
}

function clampWords(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_WORDS
  return Math.max(MIN_WORDS, Math.min(MAX_WORDS, Math.round(n)))
}

function countWords(markdown: string): number {
  // Compte basique : on enlève les blocs code (souvent JSON-LD) avant compter.
  const stripped = markdown.replace(/```[\s\S]*?```/g, '')
  const tokens = stripped.trim().split(/\s+/).filter((w) => w.length > 0)
  return tokens.length
}

/**
 * Extrait le bloc Schema.org JSON-LD à la fin de l'article (si présent).
 * Retourne null si pas trouvé ou parsing échoué.
 */
function extractSchemaJsonLd(markdown: string): Record<string, unknown> | null {
  const match = markdown.match(/```json\s*([\s\S]*?)```/i)
  if (!match) return null
  try {
    return JSON.parse(match[1].trim()) as Record<string, unknown>
  } catch {
    return null
  }
}

/**
 * Sépare le prompt image hero (entre balises ---HERO_IMAGE_PROMPT--- … ---END_HERO_IMAGE_PROMPT---)
 * du Markdown de l'article.
 *
 * Tolérant aux variantes de format :
 *   - Si les balises sont absentes : on considère TOUT comme du markdown,
 *     imagePrompt = null → fallback image_error.
 *   - Si seule la balise d'ouverture est présente : on prend tout ce qui suit
 *     jusqu'au premier `#` (H1) comme prompt image.
 *   - Le bloc Markdown final est nettoyé (trim + suppression des H1 fantômes
 *     parasites du genre "Voici l'article :" si Claude en ajoute).
 *
 * R0 anti-hero-dans-rawhtml : on supprime aussi toute balise `<img>` ou Markdown
 * image `![](…)` en TÊTE du markdown (Claude pourrait avoir ignoré la consigne).
 * L'image hero est passée UNIQUEMENT via output.image_url.
 */
function splitHeroPromptAndMarkdown(text: string): {
  imagePrompt: string | null
  markdown: string
} {
  let imagePrompt: string | null = null
  let markdown = text

  const fullPattern = /---HERO_IMAGE_PROMPT---\s*([\s\S]*?)\s*---END_HERO_IMAGE_PROMPT---/i
  const fullMatch = markdown.match(fullPattern)

  if (fullMatch) {
    imagePrompt = fullMatch[1].trim()
    // Supprime tout le bloc (balises incluses) du markdown.
    markdown = markdown.replace(fullPattern, '').trim()
  } else {
    // Fallback : seule la balise d'ouverture est présente, on prend ce qui suit
    // jusqu'au premier H1 (`#` en début de ligne).
    const openPattern = /---HERO_IMAGE_PROMPT---\s*([\s\S]*?)(?=\n#\s+)/i
    const openMatch = markdown.match(openPattern)
    if (openMatch) {
      imagePrompt = openMatch[1].trim()
      markdown = markdown.replace(/---HERO_IMAGE_PROMPT---\s*[\s\S]*?(?=\n#\s+)/i, '').trim()
    }
  }

  // R0 anti-hero-dans-rawhtml : strip toute image en tête du markdown.
  markdown = stripLeadingHeroImage(markdown)

  return { imagePrompt, markdown }
}

/**
 * Supprime toute balise `<img>` ou Markdown image `![alt](url)` placée AVANT
 * le premier H1 (ou immédiatement après le H1 sur sa propre ligne). Évite le
 * doublon visuel sur le blog GHL.
 */
function stripLeadingHeroImage(markdown: string): string {
  let cleaned = markdown.trimStart()

  // Cas 1 : Markdown image OU balise <img> AVANT le H1.
  // On enlève les lignes successives qui correspondent à des images.
  while (
    /^!\[[^\]]*\]\([^)]+\)\s*$/m.test(cleaned.split('\n')[0] ?? '') ||
    /^<img\b[^>]*\/?>\s*$/im.test(cleaned.split('\n')[0] ?? '')
  ) {
    cleaned = cleaned.split('\n').slice(1).join('\n').trimStart()
  }

  // Cas 2 : Markdown image OU balise <img> juste APRÈS le H1, sur sa propre
  // ligne (pattern fréquent quand un LLM tente de "réussir" le hero).
  cleaned = cleaned.replace(
    /^(#\s+[^\n]+\n)(?:\s*(?:!\[[^\]]*\]\([^)]+\)|<img\b[^>]*\/?>)\s*\n)+/m,
    '$1',
  )

  return cleaned
}

/**
 * Construit un texte alternatif (alt) accessible et SEO-friendly pour l'image
 * hero, basé sur le sujet de l'article. Limité à 125 caractères (recommandation
 * WCAG / Open Graph).
 */
function buildAltText(sujet: string): string {
  const base = `Illustration de l'article : ${sujet}`.trim()
  return base.length > 125 ? base.slice(0, 124) + '…' : base
}
