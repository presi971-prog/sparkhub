/**
 * Route SparkExecute — publication multi-plateformes (V1.1).
 *
 *   POST /api/sparkexecute/runs/[id]/publish
 *
 * V1.1 : vraie publication via GHL (Blog API + Social Planner API).
 *
 * Body :
 *   {
 *     platforms: PublishPlatform[],        // ex: ['ghl_blog'] | ['linkedin','instagram']
 *     options?: {
 *       blogCategoryId?: string,
 *       blogTags?: string[],
 *       blogAuthorId?: string,
 *       accountIds?: Partial<Record<SocialPlatform, string[]>>,
 *       scheduledAt?: string               // ISO 8601
 *     }
 *   }
 *
 * Workflow :
 *   1) Vérif auth + ownership du run + statut compatible (draft/validated)
 *   2) Pour chaque platform :
 *      - INSERT pending dans sparkexecute_publications
 *      - Appel publisher (publishToGhlBlog OU publishToSocialPlanner)
 *      - UPDATE en published OU failed
 *   3) Si au moins une publication a réussi → on bascule le run en 'published'
 *      avec published_at = now() (cohérence avec V1).
 *   4) Retour : { publications: PublicationResult[] }
 *
 * R0 : si une plateforme échoue, on n'avorte pas — on continue les autres.
 */

import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

import { createClient } from '@/lib/supabase/server'
import { createSparkExecuteAdmin } from '@/lib/sparkexecute/supabase-admin'
import { publishToGhlBlog } from '@/lib/sparkexecute/publishers/ghl-blog'
import { publishToSocialPlanner } from '@/lib/sparkexecute/publishers/ghl-social'
import type {
  PublicationStatus,
  PublishPlatform,
  RunStatus,
  SocialPlatform,
  SparkexecuteRun,
} from '@/lib/sparkexecute/types'

// On laisse une marge confortable : GHL Social Planner peut prendre 5-10s par
// plateforme, et un blog post avec image hero peut prendre ~3s côté GHL.
export const maxDuration = 60

interface PublishPayload {
  platforms?: PublishPlatform[]
  options?: {
    blogCategoryId?: string
    blogAuthorId?: string
    blogTags?: string[]
    accountIds?: Partial<Record<SocialPlatform, string[]>>
    scheduledAt?: string
  }
}

interface RouteContext {
  params: Promise<{ id: string }>
}

const VALID_PLATFORMS: PublishPlatform[] = [
  'ghl_blog',
  'linkedin',
  'instagram',
  'facebook',
  'google_business',
  'youtube',
  'tiktok',
  'threads',
]

const SOCIAL_PLATFORMS: SocialPlatform[] = [
  'linkedin',
  'instagram',
  'facebook',
  'google_business',
  'youtube',
  'tiktok',
  'threads',
]

const RUN_COLUMNS =
  'id, user_id, task_id, type, framework_used, input_brief, output, status, cost_usd, tokens_input, tokens_output, error_message, metadata, created_at, validated_at, published_at, updated_at'

export async function POST(req: Request, context: RouteContext) {
  const { id } = await context.params
  if (!id) {
    return NextResponse.json({ error: 'ID manquant' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  let payload: PublishPayload
  try {
    payload = (await req.json()) as PublishPayload
  } catch {
    // Compat ascendante : si pas de body, on retombe sur l'ancien comportement
    // "marquer publié" sans appel API (équivalent V1).
    payload = {}
  }

  // Charge le run (avec ownership implicite via RLS — si l'user n'est pas
  // propriétaire, on aura un null).
  const { data: run, error: loadError } = await supabase
    .from('sparkexecute_runs')
    .select(RUN_COLUMNS)
    .eq('id', id)
    .maybeSingle<SparkexecuteRun>()

  if (loadError) {
    return NextResponse.json({ error: loadError.message }, { status: 500 })
  }
  if (!run) {
    return NextResponse.json({ error: 'Run introuvable' }, { status: 404 })
  }

  // Statuts qui autorisent la publication : draft, validated, ou published
  // (republication possible — par ex. pour ajouter une nouvelle plateforme
  // ou re-pousser un article corrigé).
  // On refuse uniquement les états techniques (generating, failed, archived).
  if (
    run.status !== 'draft' &&
    run.status !== 'validated' &&
    run.status !== 'published'
  ) {
    return NextResponse.json(
      {
        error: `Ce run est au statut "${run.status}", impossible de publier.`,
      },
      { status: 409 },
    )
  }

  // === COMPAT V1 : si pas de plateformes, on garde le vieux comportement ===
  // (juste flag DB sans appel API). Permet de ne pas casser l'ancien bouton
  // "Marquer publié" si l'UI envoie un POST sans body.
  const platformsRaw = payload.platforms ?? []
  const platforms = platformsRaw.filter((p): p is PublishPlatform =>
    VALID_PLATFORMS.includes(p),
  )

  if (platforms.length === 0) {
    return legacyMarkPublished(supabase, id, run)
  }

  // === V1.1 : vraie publication multi-plateformes ===
  const admin = createSparkExecuteAdmin()
  const results: PublicationApiResult[] = []

  // === GARDE ANTI-DOUBLON (fix 03/06/2026) ===
  // Bug du 01/06 : re-cliquer "Publier" sur un run déjà publié recréait un
  // NOUVEL article GHL à chaque clic (4 articles "dentiste" en double sur le
  // blog DCG AI). On bloque donc la republication vers une plateforme où ce
  // run a DÉJÀ une publication vivante (published ou scheduled). Publier vers
  // une NOUVELLE plateforme reste possible.
  const { data: livePubs } = await admin
    .from('sparkexecute_publications')
    .select('platform, external_url')
    .eq('run_id', id)
    .in('status', ['published', 'scheduled'])
  const alreadyLive = new Map<string, string | null>()
  for (const p of (livePubs ?? []) as Array<{
    platform: PublishPlatform
    external_url: string | null
  }>) {
    alreadyLive.set(p.platform, p.external_url ?? null)
  }

  // Pré-insertion des publications en 'pending' (1 par plateforme).
  // On garde l'ID pour mettre à jour après l'appel.
  const pendingRows: Array<{ id: string; platform: PublishPlatform }> = []
  for (const platform of platforms) {
    // Déjà publié sur cette plateforme → on NE republie PAS (anti-doublon).
    if (alreadyLive.has(platform)) {
      results.push({
        platform,
        status: 'published',
        skipped: true,
        external_url: alreadyLive.get(platform) ?? null,
        error:
          'Déjà publié sur cette plateforme. Republication bloquée pour éviter un doublon.',
      })
      continue
    }
    const { data: inserted, error: insertError } = await admin
      .from('sparkexecute_publications')
      .insert({
        run_id: id,
        user_id: user.id,
        platform,
        status: 'pending' as PublicationStatus,
        scheduled_at: payload.options?.scheduledAt ?? null,
        metadata: {},
      })
      .select('id')
      .single<{ id: string }>()

    if (insertError || !inserted) {
      results.push({
        platform,
        status: 'failed',
        error: `Préparation impossible : ${insertError?.message ?? 'erreur inconnue'}`,
      })
      continue
    }
    pendingRows.push({ id: inserted.id, platform })
  }

  // Exécution effective par plateforme.
  for (const { id: pubId, platform } of pendingRows) {
    if (platform === 'ghl_blog') {
      try {
        // Catégorie automatique intelligente (DCG AI) : FAQ détectée → "Questions
        // fréquentes", sinon → "Guides". L'utilisateur peut override via options.
        const GHL_CATEGORY_GUIDES = '69f56dd988031ddb006579e3'
        const GHL_CATEGORY_FAQ = '6a1b01b0ee427950f38eca33'
        const GHL_AUTHOR_DCGAI = '69f56f1188031dd70d6596d1'
        const titleAndDesc = `${run.input_brief?.sujet ?? ''} ${run.input_brief?.audience ?? ''}`.toLowerCase()
        const looksLikeFaq = /\bfaq\b|\bquestion(s)?\b|^(comment|pourquoi|combien|quel(le)?(s)?)\b/i.test(
          run.input_brief?.sujet ?? '',
        ) || /\bfaq\b/i.test(titleAndDesc)
        const autoCategoryId = looksLikeFaq ? GHL_CATEGORY_FAQ : GHL_CATEGORY_GUIDES

        const { post_id, post_url, raw_response } = await publishToGhlBlog(run, {
          categoryId: payload.options?.blogCategoryId ?? autoCategoryId,
          authorId: payload.options?.blogAuthorId ?? GHL_AUTHOR_DCGAI,
          tags: payload.options?.blogTags,
          publishedAt: payload.options?.scheduledAt,
        })
        await admin
          .from('sparkexecute_publications')
          .update({
            status: 'published' as PublicationStatus,
            external_id: post_id,
            external_url: post_url ?? null,
            published_at: new Date().toISOString(),
            metadata: { raw_response },
          })
          .eq('id', pubId)
        results.push({
          platform,
          status: 'published',
          publication_id: pubId,
          external_id: post_id,
          external_url: post_url,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur inconnue'
        Sentry.captureException(err, {
          tags: { feature: 'sparkexecute', step: 'publish-ghl-blog' },
          extra: { runId: id, pubId },
        })
        await admin
          .from('sparkexecute_publications')
          .update({
            status: 'failed' as PublicationStatus,
            error_message: message.slice(0, 500),
          })
          .eq('id', pubId)
        results.push({ platform, status: 'failed', publication_id: pubId, error: message })
      }
      continue
    }

    // Plateformes social planner — on les groupe pour limiter les appels
    // GHL (1 appel POST par plateforme).
    // Ici on traite 1 par 1 pour pouvoir tracer pubId proprement.
    if (SOCIAL_PLATFORMS.includes(platform as SocialPlatform)) {
      const socialPlatform = platform as SocialPlatform
      const accountIds = payload.options?.accountIds?.[socialPlatform] ?? []
      try {
        const itemResults = await publishToSocialPlanner(run, {
          platforms: [socialPlatform],
          accountIds: { [socialPlatform]: accountIds },
          scheduledAt: payload.options?.scheduledAt,
        })
        const item = itemResults[0]
        if (!item) {
          throw new Error('Aucun résultat de publication renvoyé')
        }
        if (item.error) {
          await admin
            .from('sparkexecute_publications')
            .update({
              status: 'failed' as PublicationStatus,
              error_message: item.error.slice(0, 500),
            })
            .eq('id', pubId)
          results.push({
            platform,
            status: 'failed',
            publication_id: pubId,
            error: item.error,
          })
        } else {
          const finalStatus: PublicationStatus = item.scheduled
            ? 'scheduled'
            : 'published'
          await admin
            .from('sparkexecute_publications')
            .update({
              status: finalStatus,
              external_id: item.post_id ?? null,
              external_url: item.post_url ?? null,
              published_at: item.scheduled ? null : new Date().toISOString(),
              metadata: { raw_response: item.raw_response },
            })
            .eq('id', pubId)
          results.push({
            platform,
            status: finalStatus,
            publication_id: pubId,
            external_id: item.post_id,
            external_url: item.post_url,
          })
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur inconnue'
        Sentry.captureException(err, {
          tags: { feature: 'sparkexecute', step: 'publish-social' },
          extra: { runId: id, pubId, platform },
        })
        await admin
          .from('sparkexecute_publications')
          .update({
            status: 'failed' as PublicationStatus,
            error_message: message.slice(0, 500),
          })
          .eq('id', pubId)
        results.push({ platform, status: 'failed', publication_id: pubId, error: message })
      }
    }
  }

  // Si au moins une publication a réussi → on bascule le run en 'published'.
  // (Sur cette branche, run.status est déjà narrow à 'draft' | 'validated'.)
  const hasAnySuccess = results.some(
    (r) => !r.skipped && (r.status === 'published' || r.status === 'scheduled'),
  )
  if (hasAnySuccess) {
    const now = new Date().toISOString()
    const patch: Record<string, unknown> = {
      status: 'published' as RunStatus,
      published_at: now,
    }
    if (!run.validated_at) {
      patch.validated_at = now
    }
    const { error: updateError } = await supabase
      .from('sparkexecute_runs')
      .update(patch)
      .eq('id', id)
    if (updateError) {
      console.warn(
        `[SparkExecute] publish: run flag update failed for ${id}: ${updateError.message}`,
      )
    }
  }

  return NextResponse.json({ publications: results })
}

// ============================================================
// Helpers
// ============================================================

interface PublicationApiResult {
  platform: PublishPlatform
  status: PublicationStatus
  publication_id?: string
  external_id?: string | null
  external_url?: string | null
  error?: string
  /** true = republication bloquée car déjà publié (anti-doublon). */
  skipped?: boolean
}

/**
 * Compat V1 : "Marquer publié" sans appel API.
 * Toujours dispo via POST sans body (ou body sans `platforms`).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any

async function legacyMarkPublished(
  supabase: AnySupabase,
  id: string,
  existing: SparkexecuteRun,
): Promise<NextResponse> {
  const now = new Date().toISOString()
  const patch: Record<string, unknown> = {
    status: 'published' as RunStatus,
    published_at: now,
  }
  if (!existing.validated_at) {
    patch.validated_at = now
  }

  const { data, error } = await supabase
    .from('sparkexecute_runs')
    .update(patch)
    .eq('id', id)
    .select('id, status, validated_at, published_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
