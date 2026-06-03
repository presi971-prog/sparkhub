/**
 * SparkExecute — pipeline image partagé (Nano Banana → Storage).
 *
 * Pourquoi : trois générateurs ont besoin de fabriquer une image (visual seul,
 * post_linkedin pack texte+image, post_instagram pack texte+image). On
 * mutualise ici la prompt builder + l'appel Kie + l'upload bucket pour ne pas
 * dupliquer la logique (et le risque de divergence).
 *
 * Convention : tous les appelants passent un prompt d'image en ANGLAIS (Nano
 * Banana est plus précis en anglais). L'helper buildEditorialPhotoPrompt produit
 * un prompt prêt-à-l'emploi à partir d'un sujet + une intention, en gardant
 * l'ancrage Guadeloupe (R0).
 */

import { generateKieImage } from '@/lib/content-machine/kie-ai'
import { createSparkExecuteAdmin } from '../supabase-admin'

/** Coût indicatif d'1 image Nano Banana Pro 1K (utilisé pour le compteur usage). */
export const NANO_BANANA_PRO_USD_PER_IMAGE = 0.03

const BUCKET_NAME = 'sparkexecute-visuals'

/**
 * Aspect ratios supportés par le pipeline. Cohérents avec l'usage SparkExecute :
 *   - '1:1'  : carré universel (LinkedIn, profil, post générique).
 *   - '4:5'  : portrait Instagram feed.
 *   - '16:9' : paysage 1600×900 — hero d'article SEO, Open Graph, bannières.
 *
 * Note : Kie AI (Nano Banana Pro) accepte l'`aspect_ratio` comme string libre,
 * on lui passe donc directement '16:9' sans transformation. La résolution est
 * gérée par Kie ('1K' = ~1024px sur le grand côté, suffisant pour le hero blog).
 */
export type SparkExecuteAspectRatio = '1:1' | '4:5' | '16:9'

/**
 * Génère une image via Kie AI puis la ré-héberge dans notre bucket Storage.
 * Retourne l'URL publique persistante (l'URL Kie expire après quelques heures).
 *
 * Throw si KIE_API_KEY absente ou si la génération échoue — le caller décide
 * du fallback (run failed pour visual, image_error soft pour packs post).
 */
export async function generateAndStoreImage(
  prompt: string,
  aspectRatio: SparkExecuteAspectRatio = '1:1',
): Promise<string> {
  if (!process.env.KIE_API_KEY) {
    throw new Error('Configuration Nano Banana manquante')
  }

  const imageUrls = await generateKieImage(prompt, aspectRatio)
  const sourceUrl = imageUrls[0]
  if (!sourceUrl) {
    throw new Error('Aucune image renvoyée par Kie AI')
  }
  return downloadAndStore(sourceUrl)
}

/**
 * Construit un prompt éditorial Nano Banana avec ancrage Guadeloupe.
 *
 * @param subject  Sujet principal (ex : "restaurateur souriant au comptoir").
 * @param audience Cible (ex : "small business owner in Guadeloupe").
 * @param tone     Ambiance (ex : "professional and warm").
 * @param extra    Lignes additionnelles (ex : intention pack post LinkedIn).
 */
export function buildEditorialPhotoPrompt(args: {
  subject: string
  audience?: string
  tone?: string
  extra?: string
  aspectRatioHint?: 'square' | 'portrait' | 'landscape'
}): string {
  const audience = args.audience?.trim() || 'small business owner in Guadeloupe'
  const tone = args.tone?.trim() || 'professional and warm'
  const ratio =
    args.aspectRatioHint === 'portrait'
      ? 'portrait format 4:5'
      : args.aspectRatioHint === 'landscape'
        ? 'landscape format 16:9'
        : 'square format 1:1'
  const extra = args.extra ? `\n${args.extra}\n` : ''

  return `Professional editorial photograph, hyperrealistic, ${ratio}.

Subject: ${args.subject}.
Audience: ${audience}.
Tone: ${tone}.${extra}

Setting and ambiance (CRITICAL):
- Location: Guadeloupe, French Caribbean. Tropical lush vegetation (palm trees,
  hibiscus, banana leaves) or warm local Caribbean architecture (pastel wood
  shutters, vibrant colored facades). NEVER European-style gray city streets.
- Light: warm golden hour, soft tropical sunlight, slight haze.
- Clothing of any person: lightweight tropical clothing (linen shirts, light
  cotton tops). NEVER turtlenecks, NEVER heavy sweaters, NEVER pullovers.
- Mood: confident, modern, accessible. No corporate cliché.

Technical:
- Crisp focus on subject, shallow depth of field background.
- Color grading: warm, slightly desaturated, editorial photography.
- No text overlay, no logo, no watermark, no UI elements.
- High detail, photorealistic faces if humans, natural body proportions.

Negative prompts: cartoon, illustration, anime, oversaturated, 3D render,
plastic skin, text, watermark, low quality, blurry, distorted hands.`
}

/**
 * Télécharge une image depuis une URL et l'upload dans notre bucket Storage.
 * Retourne l'URL publique persistante.
 */
async function downloadAndStore(sourceUrl: string): Promise<string> {
  const supabase = createSparkExecuteAdmin()

  const response = await fetch(sourceUrl)
  if (!response.ok) {
    throw new Error(`Téléchargement source impossible : HTTP ${response.status}`)
  }
  const buffer = await response.arrayBuffer()

  // Chemin : <année-mois>/<timestamp>-<random>.png pour répartir les fichiers
  // par mois (utile si on veut purger plus tard).
  const now = new Date()
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const fileName = `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}.png`
  const storagePath = `${yearMonth}/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, buffer, {
      contentType: 'image/png',
      upsert: false,
    })

  if (uploadError) {
    throw new Error(`Upload Storage échoué : ${uploadError.message}`)
  }

  const { data: publicData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath)

  return publicData.publicUrl
}
