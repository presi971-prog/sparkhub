/**
 * SparkScan — orchestrateur d'analyse concurrentielle (V0.5).
 *
 * Pipeline complet :
 *   1. Insert scan dans sparkscan_scans (status='running')
 *   2. Compter mots-clés rankés top 20 (DataForSEO Labs)
 *   3. Construire le contexte cible (titre + description home page) ou (analyse Claude young-site)
 *   4. Récupérer les candidats bruts (DataForSEO 30 si mature, Apify Maps si young)
 *   5. QUALIFIER via Claude → ne garder que les vrais concurrents (top 10 non-noise)
 *   6. ENRICHIR chaque concurrent via Claude (positionnement + forces + faiblesses + action tactique)
 *   7. SYNTHÉTISER via Claude → top 3 priorités + market overview + plan de la semaine
 *   8. Update scan avec resultats + synthèse + cost cumulé
 *
 * Voir cadrage : memory/r0-projet-outil-concurrent.md
 */

import {
  extractDomain,
  countRankedKeywordsTop20,
  findCompetitorsByDomain,
  type Competitor,
} from './dataforseo'
import { searchGoogleMaps, type MapsPlace } from './apify-maps'
import { analyzeYoungSite } from './young-site-analyzer'
import {
  qualifyCandidates,
  selectTopCompetitors,
  type CandidateInput,
  type TargetContext,
  type Qualification,
  type ClientContext,
  type Confidence,
} from './qualifier'
import {
  enrichCompetitors,
  type EnrichInput,
  type CompetitorEnrichment,
} from './enricher'
import {
  generateSynthesis,
  verifyPriorities,
  type StrategicSynthesis,
  type SynthesisInput,
} from './synthesizer'
import { analyzeBlogs, type BlogAnalysis } from './blog-analyzer'
import {
  analyzeGeoCitations,
  type GeoCitationsResult,
} from './geo-citations'
import {
  fetchSocialMedia,
  type SocialInput,
  type SocialMediaData,
} from './social-media'
import {
  analyzeSocialBatch,
  type SocialAnalysis,
  type SocialAnalysisInput,
} from './social-analyzer'
import { deepSanitize } from './sanitize'
import {
  fetchCandidatesContextBatch,
  fetchPageSafe,
  fetchOfferPagesContent,
} from './web-fetch'
import { findWebCandidates } from './web-search-candidates'
import { findBraveCandidates } from './brave-search-candidates'
import * as Sentry from '@sentry/nextjs'

const MATURITY_THRESHOLD_TOP20 = 10
const MATURE_RAW_CANDIDATES = 30
const METHOD_B_MAX_RESULTS_PER_QUERY = 15
const METHOD_B_MAX_CANDIDATES_TO_QUALIFY = 40 // cap pour éviter timeout/JSON tronqué qualifier
const TOP_COMPETITORS_TO_ENRICH = 10

/**
 * Helper Phase C : met à jour la colonne progress du scan pour que l'UI puisse
 * afficher une vraie progression au lieu d'un écran figé pendant 12 min.
 * Non bloquant — si l'UPDATE échoue, le pipeline continue (best-effort).
 */
async function setProgress(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any,
  scanId: string,
  step: string,
  label: string,
  percent: number,
): Promise<void> {
  try {
    await supabaseAdmin
      .from('sparkscan_scans')
      .update({
        progress: {
          step,
          label,
          percent: Math.min(100, Math.max(0, Math.round(percent))),
          started_at: new Date().toISOString(),
        },
      })
      .eq('id', scanId)
  } catch (err) {
    console.warn(
      `[Progress] setProgress(${step}, ${percent}%) failed (non fatal): ${err instanceof Error ? err.message : err}`,
    )
  }
}

const TARGET_FETCH_TIMEOUT_MS = 10_000

export type NiveauZone = 'pays' | 'region' | 'departement' | 'ville'
export type ScanStatus = 'pending' | 'running' | 'completed' | 'error'
export type MaturityStatus = 'young' | 'mature'
export type MethodUsed = 'A+C' | 'B'

/**
 * Concurrent enrichi final stocké en base + renvoyé au client.
 * Le `kind` permet à l'UI de savoir si c'est un domaine SEO ou un place local.
 */
export interface EnrichedCompetitor {
  /** Identifiant stable (domain pour A, placeId/name pour B). */
  key: string
  /** Nom commercial / domaine affiché. */
  label: string
  rank: number
  qualification: Qualification
  relevance_score: number
  reason: string
  /** Degré de confiance du qualifier (high/medium/low). UI affiche le badge. */
  confidence?: Confidence
  /** Forces / faiblesses / action de Claude, ou null si l'enrichissement a échoué. */
  enrichment: CompetitorEnrichment | null
  /** Analyse de la stratégie de contenu (blog) du concurrent. */
  blog?: BlogAnalysis | null
  /** Données + analyse stratégique des réseaux sociaux (Facebook + Instagram). */
  social_media?: {
    data: SocialMediaData
    analysis: SocialAnalysis | null
  } | null
  /**
   * Indique si ce concurrent a une fiche Google Maps trouvée pendant le scan.
   * undefined = info non collectée (méthode A).
   * true = présence locale confirmée.
   * false = acteur digital-first sans présence Maps (signal "prospect potentiel"
   *         pour offres de structuration de présence locale).
   */
  has_gmaps?: boolean
  kind: 'seo' | 'local'
  /** Données brutes spécifiques au type (pour l'affichage UI). */
  raw_seo?: Competitor
  raw_local?: MapsPlace
}

export interface AnalyzeInput {
  userId: string
  url: string
  zone: string
  niveauZone: NiveauZone
  langue: string
  /** Cadrage business du client (optionnel — sans, l'IA fait du générique). */
  clientContext?: ClientContext
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any
}

export interface AnalyzeOutput {
  scan_id: string
  maturity_status: MaturityStatus | null
  ranked_keywords_count: number
  method_used: MethodUsed | null
  /** Concurrents enrichis (synthèse + détails par concurrent). */
  competitors_enriched: EnrichedCompetitor[]
  synthesis: StrategicSynthesis | null
  /** Visibilité dans les moteurs IA (Perplexity / ChatGPT-like). */
  geo_citations: GeoCitationsResult | null
  /** Avertissements non bloquants à afficher au user. */
  warnings: string[]
  cost_usd: number
  status: ScanStatus
  error_message?: string
}

function buildLocationQuery(zone: string, niveauZone: NiveauZone): string {
  const z = zone.trim()
  if (niveauZone === 'region' || niveauZone === 'departement') {
    if (!/france/i.test(z)) return `${z}, France`
  }
  return z
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24h

/**
 * Helper interne — fait le cache check + insert le scan. Retourne soit un
 * cache hit (résultat prêt), soit un scanId fraîchement créé prêt à être
 * piloté par le pipeline.
 */
async function checkCacheOrInsertScan(input: AnalyzeInput): Promise<{
  cachedOutput: AnalyzeOutput | null
  scanId: string | null
}> {
  const { userId, url, zone, niveauZone, langue, clientContext, supabaseAdmin } = input
  const domain = extractDomain(url)
  console.log(
    `[SparkScan] START analyze url=${url} domain=${domain} zone=${zone} clientCtx=${clientContext ? 'YES' : 'no'}`,
  )

  const cached = await findRecentCachedScan(
    supabaseAdmin,
    userId,
    url,
    zone,
    niveauZone,
    langue,
    clientContext,
  )
  if (cached) {
    console.log(
      `[SparkScan] CACHE HIT scan_id=${cached.scan_id} age=${cached.age_minutes}min`,
    )
    return {
      cachedOutput: {
        ...cached.output,
        warnings: [
          `Résultat depuis le cache (scan il y a ${cached.age_minutes} min). Pour relancer un vrai scan, modifie un champ (zone, cadrage, etc.).`,
          ...(cached.output.warnings ?? []),
        ],
      },
      scanId: null,
    }
  }

  const { data: scan, error: insertError } = await supabaseAdmin
    .from('sparkscan_scans')
    .insert({
      user_id: userId,
      input_url: url,
      zone,
      niveau_zone: niveauZone,
      langue,
      status: 'running',
    })
    .select('id')
    .single()

  // Si l'insert échoue à cause de la contrainte UNIQUE partielle (migration 047) =
  // un autre scan running pour le même couple (user, url, zone, niveau, langue)
  // existe déjà. C'est la protection anti-race-condition : au lieu de doubler le
  // pipeline (double facture), on récupère le scan en cours et on le renvoie.
  // Code Postgres 23505 = unique_violation.
  if (insertError && (insertError.code === '23505' || /duplicate key|unique/i.test(insertError.message))) {
    console.warn(
      `[SparkScan] DOUBLE-SUBMIT détecté pour ${userId}/${url} — récupération du scan running existant`,
    )
    const { data: existing } = await supabaseAdmin
      .from('sparkscan_scans')
      .select('id')
      .eq('user_id', userId)
      .eq('input_url', url)
      .eq('zone', zone)
      .eq('niveau_zone', niveauZone)
      .eq('langue', langue)
      .eq('status', 'running')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (existing?.id) {
      console.log(`[SparkScan] RECOVERED scan_id=${existing.id} (race condition évitée)`)
      return { cachedOutput: null, scanId: existing.id as string }
    }
    // Fallthrough — si on n'a pas retrouvé le running, c'est un autre conflit, on remonte.
  }

  if (insertError || !scan) {
    throw new Error(
      `Insert sparkscan_scans failed: ${insertError?.message ?? 'unknown'}`,
    )
  }
  const scanId = scan.id as string
  console.log(`[SparkScan] INSERTED scan_id=${scanId}`)
  return { cachedOutput: null, scanId }
}

/**
 * Pipeline interne : tout ce qui suit l'insert du scan (maturité → méthode A/B
 * → enrichissement → analyses parallèles → re-check → save). Reçoit un scanId
 * déjà inséré et un input complet.
 *
 * Utilisée par :
 *   - `analyzeUrl(input)` : await full → comportement bloquant (mode sync)
 *   - `startScanInBackground(input)` : void/catch → comportement non bloquant (mode async)
 */
async function runScanPipelineInternal(
  scanId: string,
  input: AnalyzeInput,
): Promise<AnalyzeOutput> {
  const { url, zone, niveauZone, langue, clientContext, supabaseAdmin } = input
  const domain = extractDomain(url)

  // Helper local : envoie l'étape en cours dans la colonne progress (non bloquant).
  const progress = (step: string, label: string, percent: number) =>
    setProgress(supabaseAdmin, scanId, step, label, percent)

  let totalCost = 0
  try {
    await progress('init', 'Démarrage du scan', 2)

    // 2. Maturité
    console.log(`[SparkScan] COUNTING keywords for ${domain}...`)
    await progress('maturity', 'Analyse de la maturité SEO du site', 5)
    const { count, cost: countCost } = await countRankedKeywordsTop20(
      domain,
      zone,
      langue,
    )
    totalCost += countCost
    const maturityStatus: MaturityStatus =
      count < MATURITY_THRESHOLD_TOP20 ? 'young' : 'mature'
    console.log(
      `[SparkScan] MATURITY ${maturityStatus} (count=${count}, cost=$${countCost})`,
    )

    // 3-7. Pipeline méthode A ou B
    const pipelineOut =
      maturityStatus === 'young'
        ? await runMethodB(url, zone, niveauZone, langue, clientContext, progress)
        : await runMethodA(url, domain, zone, niveauZone, langue, clientContext, progress)
    totalCost += pipelineOut.cost

    // 8. Sanitize global du pipeline output avant tout (Supabase ET réponse client).
    // Évite "Empty or invalid json" (Supabase jsonb refuse les surrogates orphelins)
    // et les crashs UI sur JSON.parse côté navigateur.
    const safePipeline = deepSanitize(pipelineOut)

    // 9. Update scan en base avec fallback si migrations 041/042 pas encore appliquées
    const finalPayload: Record<string, unknown> = {
      maturity_status: maturityStatus,
      ranked_keywords_count: count,
      method_used: safePipeline.methodUsed,
      // competitors_found garde les RAW data pour rétrocompat (UI legacy)
      competitors_found:
        safePipeline.competitors_enriched.map((c) => c.raw_seo ?? c.raw_local) ?? [],
      status: 'completed',
      cost_usd: totalCost,
      completed_at: new Date().toISOString(),
    }

    await safeUpdateScan(supabaseAdmin, scanId, finalPayload, {
      competitors_enriched: safePipeline.competitors_enriched,
      synthesis: safePipeline.synthesis,
      geo_citations: safePipeline.geo_citations,
      site_analysis: safePipeline.site_analysis ?? null,
      client_context: clientContext ?? null,
    })

    await progress('done', 'Scan terminé', 100)

    return {
      scan_id: scanId,
      maturity_status: maturityStatus,
      ranked_keywords_count: count,
      method_used: safePipeline.methodUsed,
      competitors_enriched: safePipeline.competitors_enriched,
      synthesis: safePipeline.synthesis,
      geo_citations: safePipeline.geo_citations,
      warnings: safePipeline.warnings,
      cost_usd: totalCost,
      status: 'completed',
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    console.error(`[SparkScan] CAUGHT EXCEPTION for scan ${scanId}: ${msg}`)
    if (err instanceof Error && err.stack) {
      console.error(`[SparkScan] STACK: ${err.stack}`)
    }
    // Sentry : capture l'exception avec le contexte SparkScan complet.
    // withScope isole les tags pour ce scan (n'affecte pas les autres scans en cours).
    Sentry.withScope((scope) => {
      scope.setTag('sparkscan.scan_id', scanId)
      scope.setTag('sparkscan.target_domain', domain)
      scope.setTag('sparkscan.zone', zone)
      scope.setTag('sparkscan.niveau_zone', niveauZone)
      scope.setTag('sparkscan.langue', langue)
      scope.setContext('sparkscan_input', {
        scan_id: scanId,
        url,
        zone,
        niveau_zone: niveauZone,
        langue,
        has_client_context: !!clientContext,
        cost_usd_so_far: totalCost,
      })
      Sentry.captureException(err)
    })
    await supabaseAdmin
      .from('sparkscan_scans')
      .update({
        status: 'error',
        error_message: msg,
        cost_usd: totalCost,
      })
      .eq('id', scanId)
    return {
      scan_id: scanId,
      maturity_status: null,
      ranked_keywords_count: 0,
      method_used: null,
      competitors_enriched: [],
      synthesis: null,
      geo_citations: null,
      warnings: [],
      cost_usd: totalCost,
      status: 'error',
      error_message: msg,
    }
  }
}

/**
 * Mode SYNCHRONE (await full) — fait cache check + insert + pipeline complet.
 * Bloque jusqu'à la fin. Conservée pour rétrocompat avec les call-sites existants.
 */
export async function analyzeUrl(input: AnalyzeInput): Promise<AnalyzeOutput> {
  const { cachedOutput, scanId } = await checkCacheOrInsertScan(input)
  if (cachedOutput) return cachedOutput
  if (!scanId) throw new Error('analyzeUrl: scan_id manquant après insert')
  return runScanPipelineInternal(scanId, input)
}

/**
 * Mode ASYNCHRONE (Phase C étape 2) — fait cache check + insert + lance le
 * pipeline en background SANS attendre. Renvoie immédiatement le scan_id pour
 * que le client puisse poller GET /api/sparkscan/status?scan_id=... et afficher
 * la progression réelle (au lieu d'un écran figé 12 min).
 *
 * Si cache hit → renvoie cachedOutput directement, le client n'a pas à poller.
 */
export async function startScanInBackground(input: AnalyzeInput): Promise<{
  scanId: string
  cachedOutput: AnalyzeOutput | null
}> {
  const { cachedOutput, scanId } = await checkCacheOrInsertScan(input)
  if (cachedOutput) {
    return { scanId: cachedOutput.scan_id, cachedOutput }
  }
  if (!scanId) throw new Error('startScanInBackground: scan_id manquant après insert')

  // Lance le pipeline en background. Les erreurs sont capturées + loguées + le
  // scan passe en status='error' dans la base (le catch interne s'en occupe),
  // donc le client polling verra l'erreur via GET /status.
  runScanPipelineInternal(scanId, input).catch((err) => {
    console.error(
      `[SparkScan] background pipeline crashed scan_id=${scanId}: ${err instanceof Error ? err.message : err}`,
    )
  })

  return { scanId, cachedOutput: null }
}

// ------------------------------------------------------------
// MÉTHODE A : sites mûrs (DataForSEO Competitors)
// ------------------------------------------------------------

interface PipelineOutput {
  methodUsed: MethodUsed
  competitors_enriched: EnrichedCompetitor[]
  synthesis: StrategicSynthesis | null
  geo_citations: GeoCitationsResult | null
  /** Avertissements non bloquants à afficher au user (ex : "Apify saturé"). */
  warnings: string[]
  cost: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  site_analysis?: any
}

type ProgressCallback = (step: string, label: string, percent: number) => Promise<void>

async function runMethodA(
  url: string,
  domain: string,
  zone: string,
  niveauZone: NiveauZone,
  langue: string,
  clientContext?: ClientContext,
  progress?: ProgressCallback,
): Promise<PipelineOutput> {
  const onProgress = progress ?? (async () => {})
  let cost = 0

  await onProgress('dataforseo', 'Recherche concurrents SEO (DataForSEO)', 15)
  // A1. Récupère 30 candidats DataForSEO
  const { competitors: rawCompetitors, cost: compCost } =
    await findCompetitorsByDomain(domain, zone, langue, MATURE_RAW_CANDIDATES)
  cost += compCost
  const candidates = rawCompetitors.filter(
    (c) => c.domain.toLowerCase() !== domain.toLowerCase(),
  )
  console.log(`[MethodA] RAW candidates after self-filter: ${candidates.length}`)

  // A2. Contexte cible : fetch home pour titre + description
  const targetSignal = await safeFetchTargetSignal(url)
  const target: TargetContext = {
    url,
    domain,
    title: targetSignal.title,
    description: targetSignal.description,
    zone,
    clientContext,
  }

  await onProgress('prefetch', 'Lecture des sites concurrents', 35)
  // A2.5. Pré-fetch contexte des 30 candidats (parallèle, ~5-10s, 0 €).
  // CRUCIAL pour que le qualifier ne juge plus sur un nom de domaine seul.
  // Sans ce contexte, un acteur "généraliste apparent" qui propose en réalité
  // le même service (ex : Digitallis avec offre voicebot/chatbot sur /services)
  // était systématiquement classé "indirect" alors qu'il est "direct".
  const candidateUrls = candidates.map((c) => `https://${c.domain}`)
  console.log(
    `[MethodA] PRE-FETCH context for ${candidateUrls.length} candidates...`,
  )
  const contextMap = await fetchCandidatesContextBatch(candidateUrls)
  const ctxOk = Array.from(contextMap.values()).filter(
    (c) => c.positioning.length > 50,
  ).length
  console.log(`[MethodA] PRE-FETCH done : ${ctxOk}/${candidateUrls.length} contextes utiles`)

  await onProgress('qualifier', 'Classification des concurrents (direct/indirect)', 45)
  // A3. Qualifier (1 appel Claude batch) AVEC contexte enrichi.
  // Si le site n'est pas accessible (positioning vide), on enrichit le hint pour
  // que le qualifier mette automatiquement confidence='low' (signal "à vérifier").
  const candidatesForQualifier: CandidateInput[] = candidates.map((c) => {
    const ctx = contextMap.get(`https://${c.domain}`)
    const siteUnreachable = !ctx || ctx.positioning.length < 50
    return {
      key: c.domain,
      label: c.domain,
      hint:
        `${c.shared_keywords ?? 0} mots-clés en commun` +
        (siteUnreachable ? ' — ⚠ SITE NON ACCESSIBLE, juge avec confidence:low' : ''),
      context: ctx?.positioning,
    }
  })
  const { judgments, costUsd: qualCost } = await qualifyCandidates(
    target,
    candidatesForQualifier,
    langue,
  )
  cost += qualCost

  const candidatesWithKey = candidates.map((c) => ({
    ...c,
    qualifierKey: c.domain,
  }))
  const top = selectTopCompetitors(
    candidatesWithKey,
    judgments,
    TOP_COMPETITORS_TO_ENRICH,
  )
  console.log(`[MethodA] TOP after qualify: ${top.length}`)

  await onProgress('enricher', 'Analyse des forces / faiblesses des 10 meilleurs', 55)
  // A4. Enrichir top 10 (parallèle)
  const enrichInputs: EnrichInput[] = top.map((c) => ({
    key: c.domain,
    label: c.domain,
    url: `https://${c.domain}`,
    category: null,
  }))
  const { results: enriched, totalCost: enrichCost } = await enrichCompetitors(
    target,
    enrichInputs,
    langue,
  )
  cost += enrichCost
  const enrichmentByKey = new Map(enriched.map((r) => [r.key, r.enrichment]))

  const competitors_enriched: EnrichedCompetitor[] = top.map((c, i) => ({
    key: c.domain,
    label: c.domain,
    rank: i + 1,
    qualification: c.qualification,
    relevance_score: c.relevance_score,
    reason: c.reason,
    confidence: c.confidence,
    enrichment: enrichmentByKey.get(c.domain) ?? null,
    kind: 'seo',
    raw_seo: {
      rank: i + 1,
      domain: c.domain,
      avg_position: c.avg_position,
      intersections: c.intersections,
      estimated_traffic: c.estimated_traffic,
      shared_keywords: c.shared_keywords,
    },
  }))

  await onProgress('analyses', 'Analyses croisées : blog, IA, réseaux sociaux, synthèse', 70)
  // A5. Blog analyzer + GEO citations + Synthèse — EN PARALLÈLE
  const blogInputs = competitors_enriched.map((c) => ({
    key: c.key,
    label: c.label,
    homeUrl: `https://${c.raw_seo?.domain ?? c.label}`,
  }))
  const synthInputs: SynthesisInput[] = competitors_enriched
    .filter((c) => c.qualification !== ('noise' as Qualification))
    .map((c) => ({
      key: c.key,
      label: c.label,
      qualification: c.qualification as 'direct' | 'indirect',
      relevance_score: c.relevance_score,
      reason: c.reason,
      enrichment: c.enrichment,
    }))
  const geoActors = competitors_enriched.slice(0, 5).map((c) => ({
    domain: c.raw_seo?.domain ?? c.label,
    label: c.label,
  }))

  // allSettled : si l'un des 4 modules plante, on ne perd pas les 3 autres
  // (le scan a coûté ~$0.30 et ~7min jusqu'ici, on ne jette pas tout pour
  // une erreur isolée dans un module non critique).
  const [blogSettled, geoSettled, synthSettled, socialSettled] = await Promise.allSettled([
    analyzeBlogs(blogInputs),
    analyzeGeoCitations(
      {
        domain,
        label: domain,
        sector: targetSignal.description || targetSignal.title || domain,
        zone,
      },
      geoActors,
      langue,
    ),
    generateSynthesis(target, synthInputs, langue),
    safeSocialPipeline(competitors_enriched, langue),
  ])
  const blogResults = blogSettled.status === 'fulfilled'
    ? blogSettled.value
    : (console.warn(`[Analyses/A] blog failed: ${blogSettled.reason}`), { results: [], totalCost: 0 })
  const geoResult = geoSettled.status === 'fulfilled'
    ? geoSettled.value
    : (console.warn(`[Analyses/A] GEO failed: ${geoSettled.reason}`), null)
  // La synthèse Claude est CRITIQUE : sans plan d'attaque, le rapport n'a aucune
  // valeur livrable. On échoue le scan plutôt que de livrer un rapport vide.
  if (synthSettled.status === 'rejected') {
    throw new Error(
      `Synthèse a échoué : ${synthSettled.reason instanceof Error ? synthSettled.reason.message : synthSettled.reason}`,
    )
  }
  const synthResult = synthSettled.value
  const socialResult = socialSettled.status === 'fulfilled'
    ? socialSettled.value
    : (console.warn(`[Analyses/A] social failed: ${socialSettled.reason}`), {
        fetched: { byKey: {}, cost: 0, warnings: [] },
        analyzed: { byKey: {}, totalCost: 0 },
      })
  cost += blogResults.totalCost
  cost += geoResult?.costUsd ?? 0
  cost += synthResult.costUsd
  cost += socialResult.fetched.cost + socialResult.analyzed.totalCost

  // Attache les analyses blog + RS aux concurrents enrichis
  const blogByKey = new Map(blogResults.results.map((r) => [r.key, r.analysis]))
  competitors_enriched.forEach((c) => {
    c.blog = blogByKey.get(c.key) ?? null
    const data = socialResult.fetched.byKey[c.key]
    c.social_media = data
      ? { data, analysis: socialResult.analyzed.byKey[c.key] ?? null }
      : null
  })

  await onProgress('verify', 'Vérification finale des 3 priorités', 92)
  // Phase B étape 4 : re-check des 3 priorités (résilient — si plante, on garde
  // les priorités telles quelles sans warning).
  const verifiedSynth = await verifyPriorities(
    target,
    synthResult.synthesis.top3_priorities,
    langue,
  ).catch((err) => {
    console.warn(
      `[Synthesizer/verify] failed (non fatal): ${err instanceof Error ? err.message : err}`,
    )
    return { priorities: synthResult.synthesis.top3_priorities, costUsd: 0 }
  })
  cost += verifiedSynth.costUsd
  synthResult.synthesis.top3_priorities = verifiedSynth.priorities

  return {
    methodUsed: 'A+C',
    competitors_enriched,
    synthesis: synthResult.synthesis,
    geo_citations: geoResult,
    warnings: socialResult.fetched.warnings,
    cost,
  }
}

// ------------------------------------------------------------
// MÉTHODE B : sites jeunes (Claude analyse + Apify Maps)
// ------------------------------------------------------------

async function runMethodB(
  url: string,
  zone: string,
  niveauZone: NiveauZone,
  langue: string,
  clientContext?: ClientContext,
  progress?: ProgressCallback,
): Promise<PipelineOutput> {
  const onProgress = progress ?? (async () => {})
  let cost = 0

  await onProgress('youngsite', 'Analyse sémantique de ton site', 10)
  // B1. Analyse sémantique du site (donne aussi le contexte cible)
  const { analysis, cost: analyzeCost } = await analyzeYoungSite(
    url,
    zone,
    niveauZone,
    langue,
  )
  cost += analyzeCost

  await onProgress('sources', 'Recherche concurrents (Google Maps + web)', 20)
  // B2. TROIS SOURCES EN PARALLÈLE — résilient à l'échec de l'une, l'autre ou la troisième.
  //
  // Source 1 (Apify Google Maps)      : capte les acteurs avec fiche GMaps locale.
  // Source 2 (Perplexity Web Search)  : capte les acteurs digital-first sans GMaps
  //                                     (réponses synthétisées par LLM + citations).
  // Source 3 (Brave Search Web API)   : index web indépendant — confirme/complète
  //                                     Perplexity et rattrape les acteurs bien
  //                                     référencés en SEO classique mais ignorés
  //                                     par les LLM (Phase C étape 1).
  //
  // Après fusion + dédup par domaine, chaque candidat est marqué `source` :
  //   - 'gmaps' = présence Google Maps confirmée
  //   - 'web'   = présence web seulement (= prospect potentiel pour structurer
  //               sa visibilité locale, signal business pour DCG AI)
  const locationQuery = buildLocationQuery(zone, niveauZone)
  const targetDomain = extractDomain(url).toLowerCase()

  const [apifyResult, webResult, braveResult] = await Promise.allSettled([
    searchGoogleMaps(
      analysis.search_categories,
      locationQuery,
      METHOD_B_MAX_RESULTS_PER_QUERY,
      langue.slice(0, 2),
    ),
    findWebCandidates(
      analysis.search_categories,
      zone,
      targetDomain,
      langue,
    ),
    findBraveCandidates(
      analysis.search_categories,
      zone,
      targetDomain,
      langue,
    ),
  ])

  let apifyErrorMessage: string | null = null
  let gmapsPlaces: Awaited<ReturnType<typeof searchGoogleMaps>>['places'] = []
  if (apifyResult.status === 'fulfilled') {
    gmapsPlaces = apifyResult.value.places.map((p) => ({ ...p, source: 'gmaps' as const }))
    cost += apifyResult.value.cost
    console.log(`[MethodB] SOURCE 1 (GMaps) : ${gmapsPlaces.length} places`)
  } else {
    apifyErrorMessage =
      apifyResult.reason instanceof Error
        ? apifyResult.reason.message
        : String(apifyResult.reason)
    console.warn(
      `[MethodB] Apify a échoué (${apifyErrorMessage}). Source 1 vide, on continue avec la Source 2.`,
    )
  }

  let webCandidatesCount = 0
  if (webResult.status === 'fulfilled') {
    webCandidatesCount = webResult.value.candidates.length
    cost += webResult.value.cost
    console.log(
      `[MethodB] SOURCE 2 (Web Search) : ${webCandidatesCount} candidats web ($${webResult.value.cost.toFixed(4)})`,
    )
  } else {
    console.warn(
      `[MethodB] Perplexity Web Search a échoué (${webResult.reason instanceof Error ? webResult.reason.message : webResult.reason}). Source 2 vide.`,
    )
  }

  let braveCandidatesCount = 0
  if (braveResult.status === 'fulfilled') {
    braveCandidatesCount = braveResult.value.candidates.length
    cost += braveResult.value.cost
    console.log(
      `[MethodB] SOURCE 3 (Brave Search) : ${braveCandidatesCount} candidats brave ($${braveResult.value.cost.toFixed(4)})`,
    )
  } else {
    console.warn(
      `[MethodB] Brave Search a échoué (${braveResult.reason instanceof Error ? braveResult.reason.message : braveResult.reason}). Source 3 vide.`,
    )
  }

  // Fusion par domaine : si un acteur est dans les 2 sources, on garde GMaps
  // (plus riche en data : rating, reviews, address, etc.).
  const normalizeDomain = (url: string | null): string | null => {
    if (!url) return null
    try {
      const u = new URL(url.startsWith('http') ? url : `https://${url}`)
      return u.hostname.replace(/^www\./, '').toLowerCase()
    } catch {
      return null
    }
  }
  // FUSION : on insère les candidats WEB EN PREMIER (rares, critiques), puis les
  // GMaps. L'ordre d'insertion de Map JS est préservé → quand on cap à 40 plus
  // loin, on garde TOUS les candidats web + remplit avec les meilleurs GMaps.
  // Sans ça, le cap mangeait les candidats web qui sont la valeur ajoutée V2.
  const placesByDomain = new Map<string, (typeof gmapsPlaces)[number]>()

  // 1) D'abord les candidats web Perplexity (rares, critiques, jamais cappés)
  if (webResult.status === 'fulfilled') {
    const webNames: string[] = []
    for (const w of webResult.value.candidates) {
      placesByDomain.set(w.domain, {
        placeId: null,
        name: w.name,
        address: null,
        phone: null,
        website: w.website,
        rating: null,
        reviews: null,
        category: null,
        lat: null,
        lng: null,
        googleUrl: null,
        matchedQueries: [],
        avgPosition: null,
        occurrences: 1,
        source: 'web' as const,
      })
      webNames.push(`${w.name} (${w.domain})`)
    }
    console.log(`[MethodB] WEB CANDIDATS Perplexity : ${webNames.join(', ')}`)
  }

  // 1bis) Ensuite les candidats Brave Search — on n'ajoute QUE les domaines
  // nouveaux pour ne pas écraser le nom commercial Perplexity (souvent mieux
  // calibré car deviné par LLM avec le contexte sectoriel).
  if (braveResult.status === 'fulfilled') {
    const braveNew: string[] = []
    for (const b of braveResult.value.candidates) {
      if (placesByDomain.has(b.domain)) continue
      placesByDomain.set(b.domain, {
        placeId: null,
        name: b.name,
        address: null,
        phone: null,
        website: b.website,
        rating: null,
        reviews: null,
        category: null,
        lat: null,
        lng: null,
        googleUrl: null,
        matchedQueries: [],
        avgPosition: null,
        occurrences: 1,
        source: 'web' as const,
      })
      braveNew.push(`${b.name} (${b.domain})`)
    }
    console.log(
      `[MethodB] WEB CANDIDATS Brave (nouveaux) : ${braveNew.length}/${braveResult.value.candidates.length} — ${braveNew.join(', ')}`,
    )
  }

  // 2) Ensuite les GMaps (si pas déjà en doublon par domaine)
  for (const p of gmapsPlaces) {
    if (p.website) {
      const d = normalizeDomain(p.website)
      if (d) {
        if (!placesByDomain.has(d)) placesByDomain.set(d, p)
        // Si déjà dans le Map (= candidat web doublon), on UPGRADE en GMaps
        // (data plus riche : rating, reviews, address)
        else placesByDomain.set(d, p)
      }
    } else {
      const fallbackKey = `gmaps:${p.placeId ?? `${p.name}-${p.address}`}`
      if (!placesByDomain.has(fallbackKey)) placesByDomain.set(fallbackKey, p)
    }
  }

  const places = Array.from(placesByDomain.values())
  const webRemaining = places.filter((p) => p.source === 'web').length
  console.log(
    `[MethodB] FUSION : ${places.length} candidats uniques (${gmapsPlaces.length} gmaps + ${webCandidatesCount} perplexity + ${braveCandidatesCount} brave → ${webRemaining} web uniques + reste gmaps)`,
  )

  // B3. Filtre le target lui-même (par website match) — targetDomain déjà déclaré plus haut.
  const filteredPlaces = places.filter((p) => {
    if (!p.website) return true
    try {
      const w = new URL(
        p.website.startsWith('http') ? p.website : `https://${p.website}`,
      )
        .hostname.replace(/^www\./, '')
        .toLowerCase()
      return w !== targetDomain
    } catch {
      return true
    }
  })
  console.log(`[MethodB] places after self-filter: ${filteredPlaces.length}`)

  // B4. Contexte cible (avec sector)
  const target: TargetContext = {
    url,
    domain: targetDomain,
    title: analysis.business_name,
    description: `${analysis.sector} — ${analysis.services.join(', ')}`,
    sector: analysis.sector,
    zone,
    clientContext,
  }

  await onProgress('prefetch', 'Lecture des sites concurrents', 45)
  // B5. Qualifier (cap à METHOD_B_MAX_CANDIDATES_TO_QUALIFY pour éviter timeout/JSON tronqué Claude)
  const placesToQualify = filteredPlaces.slice(0, METHOD_B_MAX_CANDIDATES_TO_QUALIFY)
  if (filteredPlaces.length > METHOD_B_MAX_CANDIDATES_TO_QUALIFY) {
    console.log(
      `[MethodB] CAP candidates qualifier ${filteredPlaces.length} → ${METHOD_B_MAX_CANDIDATES_TO_QUALIFY}`,
    )
  }

  // B4.5. Pré-fetch contexte des candidats QUI ONT UN SITE web (Google Maps).
  // Sans site web (cas fréquent en méthode B), le qualifier juge sur nom + catégorie GMaps seule.
  const placesWithWebsite = placesToQualify.filter((p) => p.website && p.website.startsWith('http'))
  console.log(
    `[MethodB] PRE-FETCH context for ${placesWithWebsite.length}/${placesToQualify.length} places ayant un site...`,
  )
  const placeContextMap =
    placesWithWebsite.length > 0
      ? await fetchCandidatesContextBatch(placesWithWebsite.map((p) => p.website!))
      : new Map()
  const ctxOkB = Array.from(placeContextMap.values()).filter(
    (c: { positioning: string }) => c.positioning.length > 50,
  ).length
  console.log(`[MethodB] PRE-FETCH done : ${ctxOkB}/${placesWithWebsite.length} contextes utiles`)

  const candidatesForQualifier: CandidateInput[] = placesToQualify.map((p, i) => {
    const ctx = p.website ? placeContextMap.get(p.website) : undefined
    // Si le candidat a un site web mais que celui-ci est inaccessible (contenu vide),
    // on indique au qualifier de mettre confidence='low' — UI montrera "À vérifier".
    const hasWebsite = !!p.website
    const siteUnreachable = hasWebsite && (!ctx || ctx.positioning.length < 50)
    const baseHint = [p.category, p.address?.split(',')[0]].filter(Boolean).join(' — ')
    return {
      key: p.placeId ?? `local-${i}`,
      label: p.name,
      hint:
        baseHint +
        (siteUnreachable ? ' — ⚠ SITE NON ACCESSIBLE, juge avec confidence:low' : ''),
      context: ctx?.positioning,
    }
  })
  await onProgress('qualifier', 'Classification des concurrents (direct/indirect)', 55)
  const { judgments, costUsd: qualCost } = await qualifyCandidates(
    target,
    candidatesForQualifier,
    langue,
  )
  cost += qualCost

  // Important : on utilise placesToQualify (cappé), pas filteredPlaces, car le qualifier
  // n'a jugé QUE ces 40 — les autres n'ont pas de jugement, donc on ne les considère pas.
  const placesWithKey = placesToQualify.map((p, i) => ({
    ...p,
    qualifierKey: p.placeId ?? `local-${i}`,
  }))
  const top = selectTopCompetitors(
    placesWithKey,
    judgments,
    TOP_COMPETITORS_TO_ENRICH,
  )

  await onProgress('enricher', 'Analyse des forces / faiblesses des 10 meilleurs', 65)
  // B6. Enrichir
  const enrichInputs: EnrichInput[] = top.map((p) => ({
    key: p.qualifierKey,
    label: p.name,
    url: p.website,
    category: p.category,
  }))
  const { results: enriched, totalCost: enrichCost } = await enrichCompetitors(
    target,
    enrichInputs,
    langue,
  )
  cost += enrichCost
  const enrichmentByKey = new Map(enriched.map((r) => [r.key, r.enrichment]))

  const competitors_enriched: EnrichedCompetitor[] = top.map((p, i) => ({
    key: p.qualifierKey,
    label: p.name,
    rank: i + 1,
    qualification: p.qualification,
    relevance_score: p.relevance_score,
    reason: p.reason,
    confidence: p.confidence,
    enrichment: enrichmentByKey.get(p.qualifierKey) ?? null,
    // Flag has_gmaps : vrai si la place vient de la source GMaps, faux si elle
    // vient de la source Web Search (= acteur digital-first sans présence GMaps).
    has_gmaps: p.source !== 'web',
    kind: 'local',
    raw_local: p,
  }))

  await onProgress('analyses', 'Analyses croisées : blog, IA, réseaux sociaux, synthèse', 78)
  // B7. Blog + GEO + Synthèse en parallèle
  const blogInputs = competitors_enriched.map((c) => ({
    key: c.key,
    label: c.label,
    homeUrl: c.raw_local?.website ?? null,
  }))
  const synthInputs: SynthesisInput[] = competitors_enriched.map((c) => ({
    key: c.key,
    label: c.label,
    qualification: c.qualification as 'direct' | 'indirect',
    relevance_score: c.relevance_score,
    reason: c.reason,
    enrichment: c.enrichment,
  }))
  // GEO : pour méthode B (sites locaux), on inclut le nom + ville comme proxy de domaine
  const geoActors = competitors_enriched.slice(0, 5).map((c) => ({
    domain:
      (c.raw_local?.website
        ? c.raw_local.website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
        : c.label),
    label: c.label,
  }))

  // allSettled : si l'un des 4 modules plante, on ne perd pas les 3 autres
  // (méthode B coûte $0.40+ et 8min avant ce point, on protège l'investissement).
  const [blogSettled, geoSettled, synthSettled, socialSettled] = await Promise.allSettled([
    analyzeBlogs(blogInputs),
    analyzeGeoCitations(
      {
        domain: targetDomain,
        label: analysis.business_name || targetDomain,
        sector: `${analysis.sector} (${analysis.services.slice(0, 3).join(', ')})`,
        zone,
      },
      geoActors,
      langue,
    ),
    generateSynthesis(target, synthInputs, langue),
    safeSocialPipeline(competitors_enriched, langue),
  ])
  const blogResults = blogSettled.status === 'fulfilled'
    ? blogSettled.value
    : (console.warn(`[Analyses/B] blog failed: ${blogSettled.reason}`), { results: [], totalCost: 0 })
  const geoResult = geoSettled.status === 'fulfilled'
    ? geoSettled.value
    : (console.warn(`[Analyses/B] GEO failed: ${geoSettled.reason}`), null)
  // La synthèse Claude est CRITIQUE pour méthode B aussi.
  if (synthSettled.status === 'rejected') {
    throw new Error(
      `Synthèse a échoué : ${synthSettled.reason instanceof Error ? synthSettled.reason.message : synthSettled.reason}`,
    )
  }
  const synthResult = synthSettled.value
  const socialResult = socialSettled.status === 'fulfilled'
    ? socialSettled.value
    : (console.warn(`[Analyses/B] social failed: ${socialSettled.reason}`), {
        fetched: { byKey: {}, cost: 0, warnings: [] },
        analyzed: { byKey: {}, totalCost: 0 },
      })
  cost += blogResults.totalCost
  cost += geoResult?.costUsd ?? 0
  cost += synthResult.costUsd
  cost += socialResult.fetched.cost + socialResult.analyzed.totalCost

  const blogByKey = new Map(blogResults.results.map((r) => [r.key, r.analysis]))
  competitors_enriched.forEach((c) => {
    c.blog = blogByKey.get(c.key) ?? null
    const data = socialResult.fetched.byKey[c.key]
    c.social_media = data
      ? { data, analysis: socialResult.analyzed.byKey[c.key] ?? null }
      : null
  })

  await onProgress('verify', 'Vérification finale des 3 priorités', 92)
  // Phase B étape 4 : re-check des 3 priorités (résilient)
  const verifiedSynthB = await verifyPriorities(
    target,
    synthResult.synthesis.top3_priorities,
    langue,
  ).catch((err) => {
    console.warn(
      `[Synthesizer/verify] failed (non fatal): ${err instanceof Error ? err.message : err}`,
    )
    return { priorities: synthResult.synthesis.top3_priorities, costUsd: 0 }
  })
  cost += verifiedSynthB.costUsd
  synthResult.synthesis.top3_priorities = verifiedSynthB.priorities

  const warnings: string[] = [...socialResult.fetched.warnings]
  if (apifyErrorMessage) {
    warnings.push(
      `Concurrents Google Maps non chargés : ${friendlyApifyMessage(apifyErrorMessage)}. Le rapport reste partiel mais l'analyse de ton site et la visibilité IA sont disponibles.`,
    )
  }

  return {
    methodUsed: 'B',
    competitors_enriched,
    synthesis: synthResult.synthesis,
    geo_citations: geoResult,
    warnings,
    cost,
    site_analysis: analysis,
  }
}

/**
 * Pipeline Réseaux Sociaux (Facebook + Instagram) :
 *   1. Extrait les URLs RS découvertes par enricher.ts (gratuit).
 *   2. Scrape les pages/profils + 5 derniers posts via Apify (3 actors en parallèle).
 *   3. Demande à Claude une analyse stratégique courte par concurrent.
 *
 * Résilient : si Apify saturé ou aucune RS trouvée, retourne des objets vides
 * et continue le pipeline principal. Les warnings remontent au user.
 */
async function runSocialPipeline(
  competitors_enriched: EnrichedCompetitor[],
  langue: string,
): Promise<{
  fetched: Awaited<ReturnType<typeof fetchSocialMedia>>
  analyzed: Awaited<ReturnType<typeof analyzeSocialBatch>>
}> {
  const inputs: SocialInput[] = competitors_enriched.map((c) => ({
    key: c.key,
    facebook: c.enrichment?.social_links?.facebook ?? null,
    instagram: c.enrichment?.social_links?.instagram ?? null,
  }))
  const fetched = await fetchSocialMedia(inputs)
  const analysisInputs: SocialAnalysisInput[] = competitors_enriched
    .filter((c) => fetched.byKey[c.key])
    .map((c) => ({
      key: c.key,
      name: c.label,
      data: fetched.byKey[c.key]!,
    }))
  const analyzed = await analyzeSocialBatch(analysisInputs, langue)
  return { fetched, analyzed }
}

function safeSocialPipeline(
  competitors_enriched: EnrichedCompetitor[],
  langue: string,
): Promise<Awaited<ReturnType<typeof runSocialPipeline>>> {
  return runSocialPipeline(competitors_enriched, langue).catch((err) => {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[Social] pipeline failed entirely: ${msg}`)
    return {
      fetched: {
        byKey: {},
        cost: 0,
        warnings: [`Réseaux sociaux non chargés : ${msg}`],
      },
      analyzed: { byKey: {}, totalCost: 0 },
    }
  })
}

function friendlyApifyMessage(raw: string): string {
  const lower = raw.toLowerCase()
  if (lower.includes('monthly usage') || lower.includes('hard limit')) {
    return "Apify a atteint sa limite mensuelle. Recharge ton compte ou attends le reset du cycle"
  }
  if (lower.includes('403')) {
    return "Apify a refusé l'appel (clé ou quota)"
  }
  if (lower.includes('timeout') || lower.includes('aborted')) {
    return "Apify n'a pas répondu à temps"
  }
  return "Apify indisponible"
}

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------

/**
 * Cache lookup : si le même user a déjà lancé EXACTEMENT le même scan
 * (URL+zone+niveau+langue+cadrage client) dans les 24h, on retourne le scan
 * précédent au lieu de re-payer. Évite les doubles factures sur reload ou démo.
 */
async function findRecentCachedScan(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any,
  userId: string,
  url: string,
  zone: string,
  niveauZone: NiveauZone,
  langue: string,
  clientContext: ClientContext | undefined,
): Promise<{ output: AnalyzeOutput; scan_id: string; age_minutes: number } | null> {
  const since = new Date(Date.now() - CACHE_TTL_MS).toISOString()
  const { data, error } = await supabaseAdmin
    .from('sparkscan_scans')
    .select('*')
    .eq('user_id', userId)
    .eq('input_url', url)
    .eq('zone', zone)
    .eq('niveau_zone', niveauZone)
    .eq('langue', langue)
    .eq('status', 'completed')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(5)

  if (error || !Array.isArray(data) || data.length === 0) return null

  // On veut un match EXACT sur le client_context (sérialisé) — y compris null = null.
  const wantedCtx = clientContext ? JSON.stringify(clientContext) : null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const match = data.find((row: any) => {
    const rowCtx = row.client_context ? JSON.stringify(row.client_context) : null
    return rowCtx === wantedCtx
  })
  if (!match) return null

  const ageMs = Date.now() - new Date(match.created_at).getTime()
  const ageMinutes = Math.round(ageMs / 60_000)

  // Reconstruit l'AnalyzeOutput à partir de la row DB.
  const output: AnalyzeOutput = {
    scan_id: match.id,
    maturity_status: match.maturity_status,
    ranked_keywords_count: match.ranked_keywords_count ?? 0,
    method_used: match.method_used,
    competitors_enriched: match.competitors_enriched ?? [],
    synthesis: match.synthesis ?? null,
    geo_citations: match.geo_citations ?? null,
    warnings: [],
    cost_usd: match.cost_usd ?? 0,
    status: 'completed',
  }
  return { output, scan_id: match.id, age_minutes: ageMinutes }
}

/**
 * Best-effort fetch + extract of title + description from the target home page.
 * Returns empty strings on failure — qualifier still works without it.
 */
async function safeFetchTargetSignal(url: string): Promise<{
  title: string
  description: string
}> {
  const fullUrl = url.startsWith('http') ? url : `https://${url}`
  const homeHtml = await fetchPageSafe(fullUrl)
  if (!homeHtml) return { title: '', description: '' }

  const title = (homeHtml.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? '').trim()
  let desc =
    (
      homeHtml.match(
        /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i,
      )?.[1] ??
      homeHtml.match(
        /<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i,
      )?.[1] ??
      ''
    ).trim()

  // Enrichir la description avec ce qu'on trouve sur les pages d'offre du site
  // cible. Sans ça, le qualifier en méthode A juge "Beeliz vs ses concurrents"
  // sans savoir que Beeliz vend AUSSI de l'IA en option premium.
  try {
    const offerFragments = await fetchOfferPagesContent(homeHtml, fullUrl, (h) => {
      const t = (h.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? '').trim()
      const d = (
        h.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)?.[1] ??
        ''
      ).trim()
      return [t, d].filter(Boolean).join(' — ')
    })
    if (offerFragments.length > 0) {
      const offersSummary = offerFragments.join(' || ').slice(0, 1500)
      const enrichedDesc = desc
        ? `${desc} || OFFRES: ${offersSummary}`
        : `OFFRES: ${offersSummary}`
      console.log(
        `[Target] enriched with ${offerFragments.length} offer pages (desc_len ${enrichedDesc.length})`,
      )
      return { title, description: enrichedDesc }
    }
  } catch (err) {
    console.warn(
      `[Target] enrich failed (non-fatal): ${err instanceof Error ? err.message : err}`,
    )
  }

  return { title, description: desc }
}

/**
 * Update scan with the base payload, then progressively retry without optional
 * columns if Supabase complains they don't exist (migrations 041/042 not yet applied).
 */
async function safeUpdateScan(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any,
  scanId: string,
  basePayload: Record<string, unknown>,
  optional: Record<string, unknown>,
): Promise<void> {
  let payload: Record<string, unknown> = { ...basePayload, ...optional }
  const optionalKeys = Object.keys(optional)

  // 1st attempt : full payload
  let { error } = await supabaseAdmin
    .from('sparkscan_scans')
    .update(payload)
    .eq('id', scanId)
  if (!error) return

  // If error mentions an optional column, drop it and retry, iteratively.
  for (let i = 0; i < optionalKeys.length; i++) {
    const offending = optionalKeys.find((k) =>
      new RegExp(k, 'i').test(error?.message ?? ''),
    )
    if (!offending) break
    console.warn(
      `[SparkScan] Colonne ${offending} absente, retry sans (applique migrations 041/042 pour la stocker)`,
    )
    delete payload[offending]
    const retry = await supabaseAdmin
      .from('sparkscan_scans')
      .update(payload)
      .eq('id', scanId)
    error = retry.error
    if (!error) return
  }
  if (error) {
    console.error(`[SparkScan] UPDATE FAILED for scan ${scanId}: ${error.message}`)
  }
}
