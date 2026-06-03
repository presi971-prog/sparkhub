/**
 * Route SparkExecute — enrichir un visuel d'une légende qui l'accompagne.
 *
 *   POST /api/sparkexecute/runs/[id]/add-legend
 *   POST /api/sparkexecute/runs/[id]/add-legend?force=true  → regénère même si
 *                                                            une légende existe
 *
 * Comportement : pour un run de type `visual` qui a déjà une image, on appelle
 * Claude pour générer une légende Instagram/LinkedIn de 80-150 mots avec 5-7
 * hashtags. La légende est stockée dans `output.legend` (string) — on enrichit
 * le run existant, on n'en crée pas un nouveau.
 *
 * Refus si :
 *   - run pas de type `visual`
 *   - run sans image_url (pas encore généré ou échec)
 *   - run archivé
 *   - run en cours de génération
 *   - run a déjà une légende ET `?force=true` n'est pas passé (anti-écrasement
 *     accidentel — le bouton "Refaire la légende" passe explicitement force=true)
 */

import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

import { callClaudeText } from '@/lib/sparkexecute/claude-text'
import { createClient } from '@/lib/supabase/server'
import type { SparkexecuteRun } from '@/lib/sparkexecute/types'

export const maxDuration = 60

interface RouteContext {
  params: Promise<{ id: string }>
}

const RUN_COLUMNS =
  'id, user_id, task_id, type, framework_used, input_brief, output, status, cost_usd, tokens_input, tokens_output, error_message, metadata, created_at, validated_at, published_at, updated_at'

export async function POST(req: Request, context: RouteContext) {
  const { id } = await context.params
  if (!id) {
    return NextResponse.json({ error: 'ID manquant' }, { status: 400 })
  }

  // ?force=true : autorise la régénération même si une légende existe déjà.
  const force = new URL(req.url).searchParams.get('force') === 'true'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  // Charge le run (auth + ownership via RLS).
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

  // Validations métier.
  if (run.type !== 'visual') {
    return NextResponse.json(
      { error: "On ne peut ajouter une légende que sur un livrable de type Visuel." },
      { status: 409 },
    )
  }
  if (run.status === 'generating') {
    return NextResponse.json(
      { error: "Le visuel est encore en fabrication. Attends qu'il soit prêt." },
      { status: 409 },
    )
  }
  if (run.status === 'archived') {
    return NextResponse.json(
      { error: 'Ce livrable est archivé, on ne peut plus l\'éditer.' },
      { status: 409 },
    )
  }
  if (!run.output?.image_url) {
    return NextResponse.json(
      { error: "Ce visuel n'a pas d'image, impossible de générer une légende qui la décrit." },
      { status: 409 },
    )
  }
  if (run.output?.legend && !force) {
    return NextResponse.json(
      {
        error:
          "Ce visuel a déjà une légende. Utilise « Refaire la légende » pour en générer une nouvelle.",
      },
      { status: 409 },
    )
  }

  // Construit le prompt Claude.
  const sujet = run.input_brief?.sujet ?? 'Sans sujet'
  const audience = run.input_brief?.audience ?? 'patrons de TPE/PME en Guadeloupe'
  const imagePrompt =
    (typeof run.output.metadata?.source_prompt === 'string'
      ? (run.output.metadata.source_prompt as string)
      : null) ?? '(prompt image non disponible)'
  const altText = run.output.alt_text ?? sujet

  const prompt = `[RÔLE]
Tu es le copywriter social media de SparkExecute. Tu écris une légende qui
accompagne une image déjà générée pour un patron de TPE/PME en Guadeloupe.

[R0 ABSOLUES]
- Ancrage Guadeloupe : références locales (Pointe-à-Pitre, Le Gosier,
  Saint-François, Basse-Terre, marché ~400 000 habitants, WhatsApp > SMS).
- Tutoiement, ton chaleureux et direct.
- INTERDIT : markdown, exemples "métro", "rue grise européenne", "froid".
- Pas de "n'hésitez pas à...". Pas de "découvrez...".

[CONTEXTE]
- Sujet du visuel : ${sujet}
- Audience visée : ${audience}
- Texte alternatif de l'image : ${altText}
- Brief utilisé pour générer l'image (anglais) : ${imagePrompt.slice(0, 800)}

[CONSIGNE]
Génère une légende Instagram/LinkedIn qui ACCOMPAGNE cette image
(elle ne doit PAS décrire ce qu'on voit, mais ajouter du sens).

Contraintes :
- Longueur : 80 à 150 mots (texte plat, pas de markdown).
- Première ligne : accroche qui donne envie de lire la suite (≤ 125 caractères).
- Une seule idée bien servie, phrases courtes.
- 5 à 7 hashtags pertinents à la fin (avec le # devant), mélange large +
  niche Guadeloupe (ex : #guadeloupe #971 #tpegp #patronsgp).
- Termine par UN CTA simple en une phrase (verbe d'action clair).
- 0 à 3 émojis maximum, jamais 2 d'affilée.

[FORMAT DE RÉPONSE]
Réponds UNIQUEMENT avec le texte de la légende, prêt à coller. Pas
d'introduction meta, pas de "Voici la légende :". Juste le texte.`

  let claudeResult: Awaited<ReturnType<typeof callClaudeText>>
  try {
    claudeResult = await callClaudeText({
      prompt,
      maxTokens: 800,
      label: 'sparkexecute-add-legend',
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    Sentry.captureException(err, {
      tags: { feature: 'sparkexecute', step: 'add-legend' },
      extra: { runId: id, userId: user.id },
    })
    return NextResponse.json(
      { error: `Génération de la légende échouée : ${msg}` },
      { status: 502 },
    )
  }

  const legend = claudeResult.text
    .replace(/^```[a-z]*\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  if (!legend) {
    return NextResponse.json(
      { error: 'Claude a renvoyé une légende vide. Réessaie dans un instant.' },
      { status: 502 },
    )
  }

  // Merge dans output (on conserve image_url, alt_text, metadata existants).
  const newOutput = {
    ...run.output,
    legend,
  }

  // On cumule le coût Claude au compteur du run (best-effort).
  const newCost = Number(run.cost_usd ?? 0) + claudeResult.costUsd
  const newTokensIn = Number(run.tokens_input ?? 0) + claudeResult.inputTokens
  const newTokensOut = Number(run.tokens_output ?? 0) + claudeResult.outputTokens

  const { data: updated, error: updateError } = await supabase
    .from('sparkexecute_runs')
    .update({
      output: newOutput,
      cost_usd: newCost,
      tokens_input: newTokensIn,
      tokens_output: newTokensOut,
    })
    .eq('id', id)
    .select(RUN_COLUMNS)
    .single<SparkexecuteRun>()

  if (updateError) {
    Sentry.captureException(updateError, {
      tags: { feature: 'sparkexecute', step: 'add-legend-save' },
      extra: { runId: id },
    })
    return NextResponse.json(
      { error: `Sauvegarde de la légende échouée : ${updateError.message}` },
      { status: 500 },
    )
  }

  return NextResponse.json({
    run_id: id,
    legend,
    run: updated,
  })
}
