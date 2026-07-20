/**
 * Orchestrateur de la machine de visibilité (mode agressif, 03/07/2026).
 *
 * Appelé par le cron quotidien /api/content-machine/generate-daily, il ajoute
 * les 3 chaînons qui manquaient à l'usine à contenus :
 *   1. ensureCalendarCoverage — le calendrier éditorial se remplit tout seul
 *      (7 jours d'avance, thèmes ANCRÉS sur les fiches métier = anti-répétition).
 *   2. pushTodayToGhl — les contenus générés (marque DCG AI) partent en
 *      PROGRAMMÉ vers GHL Social Planner aux créneaux où Thierry peut répondre
 *      aux commentaires (règle golden hour du référentiel v2.0).
 *   3. buildDigest — le récap du matin (envoyé par email via notifications.ts).
 *
 * Règles algorithmes appliquées (référentiel v2.0, sourcé) :
 *   - jamais 2 thèmes sur le même angle d'affilée (anti « AI slop »),
 *   - chaque thème ancré sur un fait local des fiches métier,
 *   - Facebook : pas de lien dans le post ; LinkedIn : max 1/jour ;
 *     Instagram : 1re ligne = mot-clé métier + Guadeloupe, ≤5 hashtags ;
 *     Google Business : jamais de téléphone (filtre publisher), 2 posts/sem.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'

import { askClaude } from '@/lib/content-machine/anthropic'
import {
  publishToSocialPlanner,
  listConnectedSocialAccounts,
  type SocialAccountsByPlatform,
} from '@/lib/sparkexecute/publishers/ghl-social'
import type { SocialPlatform, SparkexecuteRun } from '@/lib/sparkexecute/types'
import { quizFormationForDate, quizTheme } from '@/lib/content-machine/spp-quiz'

// ------------------------------------------------------------
// Rotation des métiers (2 métiers/semaine, gabarit stratégie 13/06)
// ------------------------------------------------------------

/** Fiches métier embarquées (copiées depuis dcg-ai-wiki/fiches-metier). */
const METIERS = [
  { key: 'plombiers', label: 'plombiers et artisans du bâtiment', fiche: '01-plombiers-artisans.md' },
  { key: 'osteopathes', label: 'ostéopathes et pros du bien-être', fiche: '02-osteopathes-bien-etre.md' },
  { key: 'avocats', label: 'avocats et professions juridiques', fiche: '03-avocats-juridique.md' },
  { key: 'commercants', label: 'commerçants et boutiques', fiche: '04-commercants-boutiques.md' },
  { key: 'coiffeurs', label: 'coiffeurs et instituts de beauté', fiche: '05-coiffeurs-instituts.md' },
  { key: 'garagistes', label: 'garagistes et mécaniciens', fiche: '06-garagistes-mecaniciens.md' },
] as const

/**
 * Les 2 métiers de la semaine : rotation déterministe sur le numéro de
 * semaine ISO (pas de Math.random : reproductible, testable, et le même
 * résultat quel que soit le jour de la semaine où on régénère).
 */
export function metiersForWeek(date: Date): [typeof METIERS[number], typeof METIERS[number]] {
  const week = isoWeekNumber(date)
  const first = (week * 2) % METIERS.length
  const second = (first + 1) % METIERS.length
  return [METIERS[first], METIERS[second]]
}

function isoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
}

/** Charge le contenu d'une fiche métier embarquée (tronqué pour le prompt). */
export async function loadFicheMetier(ficheFile: string, maxChars = 2600): Promise<string> {
  const p = path.join(process.cwd(), 'src', 'lib', 'content-machine', 'fiches', ficheFile)
  try {
    const content = await fs.readFile(p, 'utf-8')
    return content.slice(0, maxChars)
  } catch {
    return ''
  }
}

// ------------------------------------------------------------
// 1. Couverture du calendrier (7 jours d'avance, thèmes ancrés)
// ------------------------------------------------------------

interface CmBrand {
  id: string
  slug: string
  name: string
  description?: string
  tone?: string
  target?: string
  arguments?: string
}

/** Cadence hebdo par marque (type de contenu par jour ISO 1=lundi..7=dimanche).
 *  null = pas de contenu ce jour-là. Mode agressif DCG AI : 6 contenus/sem
 *  (le 7e jour = repos volontaire : la régularité TENUE bat le volume). */
const AGGRESSIVE_PATTERNS: Record<string, Record<number, string | null>> = {
  'dcg-ai': {
    1: 'post_image', // lundi : post texte+image (métier A)
    2: 'carousel',   // mardi : carrousel (métier A) + post Google
    3: 'video',      // mercredi : Reel (métier A)
    4: 'post_image', // jeudi : post (métier B)
    5: 'carousel',   // vendredi : carrousel (métier B) + post Google
    6: 'video',      // samedi : Reel (métier B)
    7: null,         // dimanche : repos (et régénération du calendrier)
  },
  // Concours SPP a DÉJÀ une série quotidienne programmée dans GHL jusqu'en
  // octobre 2026 (~4-5 posts/sem/compte, constaté le 04/07). La machine
  // n'ajoute qu'1 carrousel pédagogique/semaine (format complémentaire),
  // pour rester dans la fourchette saine mesurée (IG 3-5 posts/semaine).
  // + 2 articles de blog/semaine (SEO, publiés directement sur le site).
  // + 2 « QCM du jour »/semaine (07/07 : posts d'ENGAGEMENT — constat audit :
  //   0 interaction sur tous les posts, format 100 % descendant. Question
  //   VÉRIFIÉE par la plateforme, réponse demandée en commentaire).
  'concours-spp': {
    1: 'quiz',
    2: 'blog_article',
    3: 'carousel',
    5: 'quiz',
    6: 'blog_article',
    4: null, 7: null,
  },
  transpoquickd: {
    // En veille tant que la licence Dréal n'est pas là : 1 post/sem.
    2: 'post_image',
    1: null, 3: null, 4: null, 5: null, 6: null, 7: null,
  },
}

/**
 * Garantit 7 jours de calendrier d'avance pour les marques pilotées par
 * l'orchestrateur. Thèmes générés par Claude, ANCRÉS sur la fiche métier de
 * la semaine + les angles récents à ne pas répéter.
 */
export async function ensureCalendarCoverage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
): Promise<{ created: number; details: string[] }> {
  const { data: brands } = await supabase.from('cm_brands').select('*')
  const details: string[] = []
  let created = 0

  for (const brand of (brands ?? []) as CmBrand[]) {
    const pattern = AGGRESSIVE_PATTERNS[brand.slug]
    if (!pattern) continue // marques hors machine (cobeone, sparkhub) : inchangées

    // Les 7 prochains jours sans entrée existante
    const days: { date: string; isoDay: number; contentType: string }[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date()
      d.setUTCDate(d.getUTCDate() + i)
      const isoDay = d.getUTCDay() === 0 ? 7 : d.getUTCDay()
      const contentType = pattern[isoDay]
      if (!contentType) continue
      days.push({ date: d.toISOString().split('T')[0], isoDay, contentType })
    }
    if (days.length === 0) continue

    const { data: existing } = await supabase
      .from('cm_calendar')
      .select('date')
      .eq('brand_id', brand.id)
      .in('date', days.map((d) => d.date))
    const existingDates = new Set((existing ?? []).map((e: { date: string }) => e.date))
    const missing = days.filter((d) => !existingDates.has(d.date))
    if (missing.length === 0) continue

    // Angles récents à ne pas répéter (anti « AI slop »)
    const { data: recent } = await supabase
      .from('cm_calendar')
      .select('theme')
      .eq('brand_id', brand.id)
      .order('date', { ascending: false })
      .limit(14)
    const recentThemes = ((recent ?? []) as { theme: string }[])
      .map((r) => `- ${r.theme}`)
      .join('\n')

    // Ancrage métier (DCG AI uniquement : les 2 métiers de la semaine)
    let grounding = ''
    if (brand.slug === 'dcg-ai') {
      const [metierA, metierB] = metiersForWeek(new Date())
      const ficheA = await loadFicheMetier(metierA.fiche)
      const ficheB = await loadFicheMetier(metierB.fiche)
      grounding = `MÉTIERS DE LA SEMAINE (alterne : lun-mer = ${metierA.label}, jeu-sam = ${metierB.label}).
Chaque thème DOIT partir d'une galère ou d'un fait CONCRET tiré des fiches ci-dessous (jamais un thème générique du type "l'IA au service des pros") :

=== FICHE ${metierA.label} ===
${ficheA}

=== FICHE ${metierB.label} ===
${ficheB}`
    } else if (brand.slug === 'concours-spp') {
      grounding = `Thèmes STRICTEMENT ancrés sur la préparation aux concours de sapeur-pompier professionnel. Une série de posts courts de motivation tourne déjà tous les jours sur ces comptes : NE PAS faire de la motivation, faire de la MÉTHODE structurée.
PÉRIMÈTRE : épreuves ÉCRITES uniquement. LISTE FERMÉE des épreuves existantes (décret 2020-1474) : QCM, compte-rendu opérationnel (sergent), note d'analyse (lieutenant, capitaine), note administrative (lieutenant hors classe), QROC (capitaine). INTERDIT ABSOLU de traiter une épreuve absente de cette liste : il n'existe AUCUNE dissertation, aucun résumé de texte, aucune composition dans ces concours. La plateforme ne prépare PAS aux épreuves orales ni à l'entretien avec le jury (décision 07/07/2026) : JAMAIS de thème sur l'oral, l'entretien, la présentation devant jury.
CONTINUITÉ ÉDITORIALE : les thèmes de la semaine forment une mini-série : l'article de blog du mardi ouvre un sujet de méthode, le CARROUSEL du mercredi en donne la version résumée en 5 étapes (même sujet, angle "les 5 clés"), l'article du samedi ouvre un sujet différent. Le thème du carrousel doit se terminer par : (renvoi : article complet gratuit sur le blog, lien en bio).
RÈGLE ABSOLUE : aucune invention réglementaire, aucun chiffre de barème, aucune date d'épreuve, aucun contenu d'annale : uniquement de la méthode générale.`
    } else if (brand.slug === 'transpoquickd') {
      grounding = `Thèmes ancrés sur le transport de marchandises en Guadeloupe (livraison locale, fiabilité, entreprise guadeloupéenne). Sobre et factuel : l'entreprise démarre, AUCUNE promesse chiffrée, aucun faux témoignage.`
    }

    // Les entrées « quiz » ne passent pas par le thémage Claude : leur thème
    // est déterministe (rotation des concours, code parsable par spp-quiz.ts)
    // et la question elle-même viendra de la plateforme Concours SPP.
    const quizDays = missing.filter((m) => m.contentType === 'quiz')
    const themedDays = missing.filter((m) => m.contentType !== 'quiz')

    const scheduleText = themedDays
      .map((m, i) => `${i + 1}. ${m.date} — type: ${m.contentType}`)
      .join('\n')

    const systemPrompt = `Tu es directeur éditorial pour ${brand.name} (audience : ${brand.target || 'professionnels en Guadeloupe'}).
${grounding}

RÈGLES ANTI-RÉPÉTITION (vitales : les réseaux sociaux dépriorisent les comptes répétitifs en 2026) :
- Chaque thème = un angle DIFFÉRENT (une galère précise, un avant/après, un mythe à casser, une question de client, un chiffre commenté…)
- INTERDIT de reprendre les angles récents suivants :
${recentThemes || '(aucun)'}
- Zéro invention : pas de faux témoignage, pas de chiffre inventé, pas de promesse de résultat.

Réponds UNIQUEMENT en JSON : un tableau de strings, un thème par ligne du planning, dans l'ordre. Pas de markdown.`

    let themes: string[] = []
    if (themedDays.length > 0) {
      try {
        const raw = await askClaude(systemPrompt, `Planning à thématiser :\n${scheduleText}`, 1500)
        themes = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
      } catch {
        themes = themedDays.map((m) => `Contenu ${m.contentType} ancré métier (${m.date})`)
      }
    }

    const rows = [
      ...themedDays.map((m, i) => ({
        brand_id: brand.id,
        content_type: m.contentType,
        theme: themes[i] || `Contenu ${m.contentType}`,
        date: m.date,
        status: 'planned',
      })),
      ...quizDays.map((m) => {
        const d = new Date(`${m.date}T12:00:00Z`)
        return {
          brand_id: brand.id,
          content_type: m.contentType,
          theme: quizTheme(quizFormationForDate(d, isoWeekNumber(d))),
          date: m.date,
          status: 'planned',
        }
      }),
    ]
    const { error } = await supabase.from('cm_calendar').insert(rows)
    if (!error) {
      created += rows.length
      details.push(`${brand.slug}: +${rows.length} jours`)
    } else {
      details.push(`${brand.slug}: ERREUR ${error.message}`)
    }
  }

  return { created, details }
}

// ------------------------------------------------------------
// 2. Publication programmée du jour (marque DCG AI uniquement en V1)
// ------------------------------------------------------------

/** Créneaux de publication (UTC) : ceux validés par la campagne de juin
 *  (LinkedIn 7h30 GP / FB 13h GP / IG 19h GP), où Thierry peut répondre
 *  aux commentaires dans l'heure (golden hour). */
const PLATFORM_SLOTS_UTC: Partial<Record<SocialPlatform, { h: number; m: number }>> = {
  linkedin: { h: 11, m: 30 },
  facebook: { h: 17, m: 0 },
  instagram: { h: 23, m: 0 },
  google_business: { h: 15, m: 0 },
  tiktok: { h: 21, m: 0 },
  youtube: { h: 20, m: 0 },
}

/**
 * SÉPARATION STRICTE DES MARQUES : la location GHL contient les comptes de
 * PLUSIEURS entités (Cobeone, DCG AI, Concours SPP, Locavore…). Chaque marque
 * ne publie QUE sur les comptes listés ici, identifiés par leur NOM EXACT
 * dans GHL. Si un compte est renommé, la publication échoue avec une alerte
 * dans le digest (échec sûr) plutôt que de publier sur la mauvaise page.
 */
const BRAND_SOCIAL_ACCOUNT_NAMES: Record<string, Partial<Record<SocialPlatform, string[]>>> = {
  'dcg-ai': {
    facebook: ['DCG AI'],
    instagram: ['dcg.ai'],
    linkedin: ['Digital Code Growth'],
    google_business: ['Digital Code Growth'],
    tiktok: ['DCG AI'],
    // youtube : la chaîne connectée (Dom-Com Digital Expert) n'est pas DCG AI.
  },
  'concours-spp': {
    facebook: ['Concours SPP'],
    instagram: ['concours.spp'],
  },
}

/** Réseaux visés selon le type de contenu (cadences agressives du plan).
 *  LinkedIn ne reçoit qu'1 contenu/jour max : le post ou le carrousel, pas les 2. */
function platformsForContent(
  contentType: string,
  isoDay: number,
  brandSlug: string,
): SocialPlatform[] {
  const base: Record<string, SocialPlatform[]> = {
    post_image: ['facebook', 'instagram', 'linkedin'],
    carousel: ['facebook', 'instagram', 'linkedin'],
    video: ['facebook', 'instagram', 'tiktok', 'youtube'],
    // QCM du jour : réseaux à commentaires uniquement (la mécanique = répondre
    // en commentaire ; pas de LinkedIn, la marque SPP n'y a pas de compte).
    quiz: ['facebook', 'instagram'],
  }
  const platforms = [...(base[contentType] ?? ['facebook'])]
  // Post Google 2x/semaine : mardi et vendredi (jours carrousel DCG AI)
  if (isoDay === 2 || isoDay === 5) platforms.push('google_business')
  // Une marque ne vise que les réseaux où elle a un compte déclaré.
  const allowed = BRAND_SOCIAL_ACCOUNT_NAMES[brandSlug] ?? {}
  return platforms.filter((p) => (allowed[p] ?? []).length > 0)
}

interface PushSummaryItem {
  content_id: string
  brand: string
  content_type: string
  theme: string
  scheduled: { platform: string; at: string }[]
  errors: { platform: string; error: string }[]
}

/**
 * Pousse vers GHL (en PROGRAMMÉ aux créneaux du jour) les contenus du jour
 * de la marque DCG AI qui sont générés et non rejetés. Idempotent via
 * cm_contents.pushed_at (migration 057).
 */
export async function pushTodayToGhl(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  /** true = simulation : calcule tout (réseaux, créneaux) sans appeler GHL ni marquer pushed_at. */
  dryRun = false,
): Promise<{ pushed: PushSummaryItem[]; skipped: number }> {
  const today = new Date().toISOString().split('T')[0]
  const isoDay = new Date().getUTCDay() === 0 ? 7 : new Date().getUTCDay()

  // Marques câblées à des comptes sociaux (séparation stricte par nom de compte).
  const wiredSlugs = Object.keys(BRAND_SOCIAL_ACCOUNT_NAMES)
  const { data: brandRows } = await supabase
    .from('cm_brands')
    .select('id, slug, name')
    .in('slug', wiredSlugs)
  const brands = (brandRows ?? []) as { id: string; slug: string; name: string }[]
  if (brands.length === 0) return { pushed: [], skipped: 0 }

  let accounts: SocialAccountsByPlatform
  try {
    accounts = await listConnectedSocialAccounts()
  } catch (err) {
    console.error(`[orchestrator] Comptes GHL illisibles: ${err instanceof Error ? err.message : err}`)
    return { pushed: [], skipped: -1 }
  }

  /** Ids de comptes autorisés pour une marque, plateforme par plateforme. */
  function brandAccountIds(brandSlug: string): Record<SocialPlatform, string[]> {
    const allowed = BRAND_SOCIAL_ACCOUNT_NAMES[brandSlug] ?? {}
    return Object.fromEntries(
      Object.entries(accounts).map(([platform, list]) => [
        platform,
        (list ?? [])
          .filter((a) => (allowed[platform as SocialPlatform] ?? []).includes(a.name))
          .map((a) => a.id),
      ]),
    ) as Record<SocialPlatform, string[]>
  }

  const pushed: PushSummaryItem[] = []
  let skipped = 0

  for (const brand of brands) {
    const accountIds = brandAccountIds(brand.slug)

    const { data: entries } = await supabase
      .from('cm_calendar')
      .select('id, date, content_type, theme')
      .eq('brand_id', brand.id)
      .eq('date', today)
    if (!entries || entries.length === 0) continue

    const calendarIds = entries.map((e: { id: string }) => e.id)
    const { data: contents, error: contentsError } = await supabase
      .from('cm_contents')
      .select('id, calendar_id, content_type, text_content, status, pushed_at')
      .in('calendar_id', calendarIds)
      .in('status', ['pending', 'approved', 'modified'])
      .is('pushed_at', null)

    if (contentsError) {
      // Cas typique : migration 057 (pushed_at) pas encore appliquée.
      console.error(`[orchestrator] Lecture cm_contents impossible: ${contentsError.message}`)
      return { pushed, skipped: -1 }
    }
    if (!contents || contents.length === 0) continue

  for (const content of contents) {
    const entry = entries.find((e: { id: string }) => e.id === content.calendar_id)
    if (!entry || !content.text_content) {
      skipped++
      continue
    }

    // Médias du contenu (image de couverture / vidéo)
    const { data: assets } = await supabase
      .from('cm_assets')
      .select('type, public_url, position')
      .eq('content_id', content.id)
      .order('position', { ascending: true })
    const imageUrl = (assets ?? []).find(
      (a: { type: string; public_url: string | null }) =>
        (a.type === 'image' || a.type === 'carousel_slide') && a.public_url,
    )?.public_url
    const videoUrl = (assets ?? []).find(
      (a: { type: string; public_url: string | null }) => a.type === 'video' && a.public_url,
    )?.public_url

    // Pseudo-run minimal : le publisher GHL ne lit que output.content /
    // output.hashtags / output.image_url / output.video_url.
    const pseudoRun = {
      id: content.id,
      output: {
        content: content.text_content,
        hashtags: [],
        image_url: imageUrl ?? undefined,
        video_url: videoUrl ?? undefined,
      },
    } as unknown as SparkexecuteRun

    const platforms = platformsForContent(entry.content_type, isoDay, brand.slug)
    const item: PushSummaryItem = {
      content_id: content.id,
      brand: brand.slug,
      content_type: entry.content_type,
      theme: entry.theme,
      scheduled: [],
      errors: [],
    }

    // Garde-fou média (GHL refuse un post sans média sur la plupart des réseaux,
    // constaté 04/07 : erreur 422 « media must be an array with media objects »).
    const hasMedia = !!(imageUrl || videoUrl)
    if (entry.content_type === 'video' && !videoUrl) {
      item.errors.push({
        platform: 'tous',
        error: 'Vidéo non générée (vérifier les crédits Kie AI) : contenu non poussé.',
      })
      if (!dryRun) {
        await supabase
          .from('cm_contents')
          .update({ pushed_at: new Date().toISOString(), push_results: { errors: item.errors } })
          .eq('id', content.id)
      }
      pushed.push(item)
      continue
    }

    for (const platform of platforms) {
      const slot = PLATFORM_SLOTS_UTC[platform]
      if (!slot) continue
      // Sans média : seuls Facebook et LinkedIn acceptent le texte seul.
      if (!hasMedia && platform !== 'facebook' && platform !== 'linkedin') {
        item.errors.push({ platform, error: 'Pas de média : réseau sauté (média requis).' })
        continue
      }
      const when = new Date()
      when.setUTCHours(slot.h, slot.m, 0, 0)
      // Créneau déjà passé (>-30 min) → demain même heure, plutôt que publier
      // dans une heure creuse où personne ne peut répondre aux commentaires.
      if (when.getTime() < Date.now() + 30 * 60 * 1000) {
        when.setUTCDate(when.getUTCDate() + 1)
      }
      if (dryRun) {
        const hasAccount = (accountIds[platform] ?? []).length > 0
        if (hasAccount) item.scheduled.push({ platform, at: when.toISOString() })
        else item.errors.push({ platform, error: 'Aucun compte connecté (dry run)' })
        continue
      }
      const results = await publishToSocialPlanner(pseudoRun, {
        platforms: [platform],
        accountIds,
        scheduledAt: when.toISOString(),
      })
      for (const r of results) {
        if (r.error) item.errors.push({ platform: r.platform, error: r.error })
        else item.scheduled.push({ platform: r.platform, at: when.toISOString() })
      }
    }

    if (!dryRun) {
      await supabase
        .from('cm_contents')
        .update({
          pushed_at: new Date().toISOString(),
          push_results: { scheduled: item.scheduled, errors: item.errors },
        })
        .eq('id', content.id)
    }

    pushed.push(item)
  }
  }

  return { pushed, skipped }
}

// ------------------------------------------------------------
// 3. Articles de blog Concours SPP (générés + publiés directement)
// ------------------------------------------------------------

/**
 * Traite les entrées calendrier `blog_article` du jour (marque concours-spp) :
 * génère un article MÉTHODE en markdown (blindage anti-invention strict :
 * jamais de chiffre réglementaire, de barème, de date d'épreuve), le publie en
 * BROUILLON sur le blog du site Concours SPP, puis envoie l'article complet
 * sur Telegram avec les liens Publier/Rejeter (validation obligatoire depuis
 * l'incident « dissertation » du 18/07/2026 : plus jamais de publication
 * directe). L'état apparaît dans le digest du matin.
 */
export async function generateAndPublishSppArticles(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
): Promise<{ pending: { title: string; url: string | null }[]; errors: string[] }> {
  const pending: { title: string; url: string | null }[] = []
  const errors: string[] = []
  const today = new Date().toISOString().split('T')[0]

  const { data: brand } = await supabase
    .from('cm_brands')
    .select('id, slug, name')
    .eq('slug', 'concours-spp')
    .maybeSingle()
  if (!brand) return { pending, errors }

  const { data: entries } = await supabase
    .from('cm_calendar')
    .select('id, date, content_type, theme, status')
    .eq('brand_id', brand.id)
    .eq('date', today)
    .eq('content_type', 'blog_article')
    .eq('status', 'planned')
  if (!entries || entries.length === 0) return { pending, errors }

  const { publishToConcoursSppBlog } = await import(
    '@/lib/sparkexecute/publishers/concours-spp-blog'
  )
  const { sendBlogValidationRequest } = await import('@/lib/content-machine/blog-validation')

  for (const entry of entries) {
    try {
      const systemPrompt = `Tu rédiges un article de blog pour Concours SPP, la plateforme de préparation aux concours de sapeur-pompier professionnel. Audience : candidats aux concours (caporal, lieutenant, capitaine), souvent en poste, qui préparent en plus de leur travail.

RÈGLES ABSOLUES (crédibilité de la plateforme, non négociables) :
- UNIQUEMENT de la MÉTHODE : organisation de révision, préparation mentale, hygiène de travail, préparation physique GÉNÉRALE, gestion du stress, planification.
- INTERDIT : tout chiffre réglementaire, barème, coefficient, durée d'épreuve, date, contenu de programme officiel, référence à un arrêté. Si le sujet t'y pousse, reste général et renvoie le lecteur vers « les textes officiels de ton concours ».
- INTERDIT : témoignage inventé, statistique inventée, promesse de réussite.
- Ton : direct, tutoiement, concret, phrases courtes. Style sobre, AUCUN tiret long (—).

FORMAT : markdown. UN titre H1 accrocheur (c'est le titre de l'article), une intro de 2 phrases qui répond à la question, des sections H2 avec des étapes actionnables, une conclusion avec UN conseil unique à appliquer aujourd'hui. 700 à 1000 mots.`

      const markdown = await askClaude(
        systemPrompt,
        `Écris l'article sur ce thème : "${entry.theme}"`,
        3500,
      )

      const pseudoRun = {
        id: entry.id,
        input_brief: { sujet: entry.theme },
        output: { content: markdown, image_url: null },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any

      // Brouillon UNIQUEMENT : la mise en ligne passe par la validation Telegram.
      const result = await publishToConcoursSppBlog(pseudoRun, {
        status: 'draft',
        category: 'conseil',
      })

      const { data: content, error: insertError } = await supabase
        .from('cm_contents')
        .insert({
          calendar_id: entry.id,
          brand_id: brand.id,
          content_type: 'blog_article',
          text_content: markdown,
          status: 'pending',
          push_results: { blog: { post_id: result.post_id, url: result.post_url } },
        })
        .select('id')
        .single()
      if (insertError || !content) {
        throw new Error(`insertion cm_contents échouée: ${insertError?.message ?? 'pas de ligne'}`)
      }
      await supabase.from('cm_calendar').update({ status: 'generated' }).eq('id', entry.id)

      const tg = await sendBlogValidationRequest(content.id, entry.theme, markdown)
      if (!tg.ok) {
        // L'article est en brouillon, rien n'est perdu : le digest de 6h GP
        // signale l'attente, mais on trace l'échec d'envoi.
        errors.push(`${entry.theme}: envoi Telegram échoué (${tg.error})`)
      }

      pending.push({ title: entry.theme, url: result.post_url })
      console.log(`[orchestrator] BLOG SPP en brouillon, validation Telegram envoyée: ${entry.theme}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`${entry.theme}: ${msg}`)
      console.error(`[orchestrator] BLOG SPP échec (non bloquant): ${msg}`)
    }
  }

  return { pending, errors }
}
