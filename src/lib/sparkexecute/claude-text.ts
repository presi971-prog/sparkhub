/**
 * SparkExecute — appel Claude avec retour TEXTE (pas JSON).
 *
 * Les générateurs SparkExecute produisent du Markdown ou du texte plat,
 * pas du JSON. Le client centralisé `src/lib/sparkscan/claude.ts` est
 * spécialisé JSON-only (callClaudeJson), donc on ajoute ici une variante
 * sœur qui partage les mêmes constantes (modèle, pricing, retry).
 *
 * Réutilise volontairement le même modèle (claude-sonnet-4-6), pricing
 * et logique retry que SparkScan / SparkPilot pour rester cohérent.
 */

import {
  CLAUDE_PRICE_INPUT_PER_M,
  CLAUDE_PRICE_OUTPUT_PER_M,
} from '@/lib/sparkscan/claude'
import { retryable } from '@/lib/sparkscan/retry'

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-6'
const DEFAULT_TIMEOUT_MS = 90_000

export interface ClaudeTextOptions {
  /** Prompt complet (system + user concaténés). */
  prompt: string
  /** Max tokens de la réponse. Default 4096 (suffisant pour article 2000 mots). */
  maxTokens?: number
  /** Timeout réseau en ms. */
  timeoutMs?: number
  /** Label pour les logs serveur (ex : "sparkexecute-article-seo"). */
  label?: string
}

export interface ClaudeTextResult {
  /** Texte brut renvoyé par Claude (déjà nettoyé des fences markdown si présents). */
  text: string
  inputTokens: number
  outputTokens: number
  costUsd: number
}

/**
 * Appel Claude qui retourne du TEXTE (pas JSON).
 * Retry 1× après 2s en cas d'erreur réseau / timeout / HTTP 5xx.
 */
export async function callClaudeText(
  opts: ClaudeTextOptions,
): Promise<ClaudeTextResult> {
  return retryable(() => callClaudeTextOnce(opts), opts.label ?? 'Claude')
}

async function callClaudeTextOnce(
  opts: ClaudeTextOptions,
): Promise<ClaudeTextResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY env var requise')

  const { prompt, maxTokens = 4096, timeoutMs = DEFAULT_TIMEOUT_MS, label } = opts
  const tag = label ? `[Claude/${label}]` : '[Claude]'

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  let res: Response
  try {
    res = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timeout)
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`${tag} fetch failed: ${msg}`)
  }
  clearTimeout(timeout)

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${tag} HTTP ${res.status}: ${text.slice(0, 400)}`)
  }

  const body = (await res.json()) as {
    content: { type: string; text: string }[]
    usage: { input_tokens: number; output_tokens: number }
  }
  const textBlock = body.content.find((c) => c.type === 'text')?.text ?? ''
  const inputTokens = body.usage.input_tokens
  const outputTokens = body.usage.output_tokens
  const costUsd =
    (inputTokens / 1_000_000) * CLAUDE_PRICE_INPUT_PER_M +
    (outputTokens / 1_000_000) * CLAUDE_PRICE_OUTPUT_PER_M

  console.log(
    `${tag} in=${inputTokens} out=${outputTokens} cost=$${costUsd.toFixed(4)}`,
  )

  return {
    text: textBlock.trim(),
    inputTokens,
    outputTokens,
    costUsd,
  }
}
