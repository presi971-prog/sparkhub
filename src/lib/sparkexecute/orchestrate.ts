/**
 * SparkExecute — orchestrateur d'exécution d'un run.
 *
 * Rôle : prend un run en base (statut 'generating'), route vers le bon
 * générateur selon `type`, met à jour le run avec le résultat, et incrémente
 * le compteur d'usage quotidien.
 *
 * Idempotence : si le run est déjà en statut final (draft / validated /
 * published / archived), on ne fait rien (évite les doubles exécutions).
 *
 * Side effects autorisés :
 *   - UPDATE sparkexecute_runs
 *   - UPSERT sparkexecute_usage
 *   - INSERT storage.objects (via les générateurs : visual)
 *   - Sentry capture si erreur
 */

import * as Sentry from '@sentry/nextjs'

import { createSparkExecuteAdmin } from './supabase-admin'
import { generateArticleSeo } from './generators/article-seo'
import { generatePostInstagram } from './generators/post-instagram'
import { generatePostLinkedIn } from './generators/post-linkedin'
import { generateVisual } from './generators/visual'
import { RUN_TYPE_AVAILABLE_V1 } from './type-mapping'
import type {
  RunInputBrief,
  RunOutput,
  RunStatus,
  RunType,
  SparkexecuteRun,
} from './types'
import type { SparkpilotTask } from '@/lib/sparkpilot/types'

/**
 * Exécute un run par son identifiant.
 *
 * @param runId  Identifiant du run à exécuter.
 * @returns      Statut final + éventuel message d'erreur.
 */
export async function executeRun(runId: string): Promise<{
  status: RunStatus
  errorMessage: string | null
}> {
  const supabase = createSparkExecuteAdmin()

  // 1) Charge le run.
  const { data: run, error: loadError } = await supabase
    .from('sparkexecute_runs')
    .select(
      'id, user_id, task_id, type, framework_used, input_brief, output, status, cost_usd, tokens_input, tokens_output, error_message, metadata, created_at, validated_at, published_at, updated_at',
    )
    .eq('id', runId)
    .maybeSingle<SparkexecuteRun>()

  if (loadError || !run) {
    const msg = loadError?.message ?? 'Run introuvable'
    console.error(`[SparkExecute] executeRun: ${msg}`)
    return { status: 'failed', errorMessage: msg }
  }

  // 2) Idempotence : si déjà sorti de 'generating', on ne refait rien.
  if (run.status !== 'generating') {
    console.info(
      `[SparkExecute] Run ${runId} déjà au statut ${run.status}, on n'exécute pas.`,
    )
    return { status: run.status, errorMessage: run.error_message }
  }

  // 3) Vérif que le type est implémenté en V1.
  if (!RUN_TYPE_AVAILABLE_V1[run.type]) {
    const msg = `Le type de livrable "${run.type}" arrive bientôt. Pour le moment, choisis : article SEO, post LinkedIn, post Instagram ou visuel.`
    await markFailed(runId, msg)
    return { status: 'failed', errorMessage: msg }
  }

  // 4) Charge la tâche parente (si elle existe). Best-effort : on n'échoue pas si KO.
  let parentTask: SparkpilotTask | null = null
  if (run.task_id) {
    const { data: taskRow } = await supabase
      .from('sparkpilot_tasks')
      .select(
        'id, plan_id, priority_index, title, description, due_date, estimated_duration_minutes, status, completed_at, order_index, metadata, created_at',
      )
      .eq('id', run.task_id)
      .maybeSingle<SparkpilotTask>()
    parentTask = taskRow ?? null
  }

  // 5) Route vers le générateur approprié.
  try {
    const generated = await dispatchGeneration(run.type, run.input_brief, parentTask)

    // Cas particulier : le générateur visual peut renvoyer un output "vide" en cas
    // d'erreur soft (config manquante, échec Kie) — on bascule alors en 'failed'.
    const hasUsableOutput = isOutputUsable(run.type, generated.output)
    if (!hasUsableOutput) {
      const errorMsg =
        (generated.output.metadata?.error as string | undefined) ??
        'Génération renvoyée vide par le moteur.'
      await markFailedWithCost(runId, errorMsg, generated.cost)
      return { status: 'failed', errorMessage: errorMsg }
    }

    // 6) Update du run en 'draft' avec le résultat.
    const { error: updateError } = await supabase
      .from('sparkexecute_runs')
      .update({
        status: 'draft' as RunStatus,
        output: generated.output,
        framework_used: generated.frameworkUsed,
        cost_usd: generated.cost.usd,
        tokens_input: generated.cost.inputTokens,
        tokens_output: generated.cost.outputTokens,
        error_message: null,
      })
      .eq('id', runId)

    if (updateError) {
      await markFailed(runId, `Sauvegarde du résultat échouée : ${updateError.message}`)
      return {
        status: 'failed',
        errorMessage: `Sauvegarde du résultat échouée : ${updateError.message}`,
      }
    }

    // 7) Incrémente le compteur quotidien d'usage (best-effort).
    await incrementUsage(run.user_id, generated.cost.usd)

    console.info(
      `[SparkExecute] Run ${runId} terminé. Type=${run.type} framework=${generated.frameworkUsed} cost=$${generated.cost.usd.toFixed(4)}`,
    )

    return { status: 'draft', errorMessage: null }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    Sentry.captureException(err, {
      tags: { feature: 'sparkexecute', step: 'orchestrate' },
      extra: { runId, type: run.type, userId: run.user_id },
    })
    await markFailed(runId, msg)
    return { status: 'failed', errorMessage: msg }
  }
}

// ============================================================
// Helpers internes
// ============================================================

interface GenerationResult {
  output: RunOutput
  cost: { usd: number; inputTokens: number; outputTokens: number }
  frameworkUsed: string
}

async function dispatchGeneration(
  type: RunType,
  brief: RunInputBrief,
  task: SparkpilotTask | null,
): Promise<GenerationResult> {
  switch (type) {
    case 'article_seo':
      return generateArticleSeo(brief, task)
    case 'post_linkedin':
      return generatePostLinkedIn(brief, task)
    case 'post_instagram':
      return generatePostInstagram(brief, task)
    case 'visual':
      return generateVisual(brief, task)
    default:
      throw new Error(`Générateur manquant pour le type "${type}"`)
  }
}

/**
 * Vérifie qu'un output est utilisable. Pour les visuels, il faut une image_url.
 * Pour les autres types, il faut du content non vide.
 */
function isOutputUsable(type: RunType, output: RunOutput): boolean {
  if (type === 'visual') {
    return typeof output.image_url === 'string' && output.image_url.length > 0
  }
  return typeof output.content === 'string' && output.content.trim().length > 0
}

/**
 * Marque le run comme failed sans toucher au coût (pour erreurs avant génération).
 */
async function markFailed(runId: string, errorMessage: string): Promise<void> {
  const supabase = createSparkExecuteAdmin()
  await supabase
    .from('sparkexecute_runs')
    .update({
      status: 'failed' as RunStatus,
      error_message: errorMessage.slice(0, 500),
    })
    .eq('id', runId)
}

/**
 * Comme markFailed, mais conserve le coût engagé (cas : Claude a tourné puis on rejette).
 */
async function markFailedWithCost(
  runId: string,
  errorMessage: string,
  cost: { usd: number; inputTokens: number; outputTokens: number },
): Promise<void> {
  const supabase = createSparkExecuteAdmin()
  await supabase
    .from('sparkexecute_runs')
    .update({
      status: 'failed' as RunStatus,
      error_message: errorMessage.slice(0, 500),
      cost_usd: cost.usd,
      tokens_input: cost.inputTokens,
      tokens_output: cost.outputTokens,
    })
    .eq('id', runId)
}

/**
 * Upsert dans sparkexecute_usage : +1 run, +cost_usd pour le jour courant.
 *
 * Best-effort : on log si ça échoue mais on ne propage pas l'erreur (le run
 * est déjà en draft, on ne veut pas le re-flag failed pour un compteur).
 */
async function incrementUsage(userId: string, costUsd: number): Promise<void> {
  try {
    const supabase = createSparkExecuteAdmin()
    const day = new Date().toISOString().split('T')[0]

    // Tentative d'upsert atomique. Si la ligne existe, on l'incrémente via RPC ;
    // sinon on insère. Comme on n'a pas de RPC dédiée en base, on fait 2 passes :
    //   1) tente l'INSERT
    //   2) si conflit (déjà une ligne), UPDATE avec +1 / +cost
    const { error: insertError } = await supabase
      .from('sparkexecute_usage')
      .insert({
        user_id: userId,
        day,
        runs_count: 1,
        cost_usd: costUsd,
      })

    if (insertError) {
      // Conflit primary key → on incrémente la ligne existante.
      const { data: existing } = await supabase
        .from('sparkexecute_usage')
        .select('runs_count, cost_usd')
        .eq('user_id', userId)
        .eq('day', day)
        .maybeSingle<{ runs_count: number; cost_usd: number }>()

      if (existing) {
        await supabase
          .from('sparkexecute_usage')
          .update({
            runs_count: existing.runs_count + 1,
            cost_usd: Number(existing.cost_usd) + costUsd,
          })
          .eq('user_id', userId)
          .eq('day', day)
      }
    }
  } catch (err) {
    console.error('[SparkExecute] incrementUsage best-effort failed:', err)
  }
}
