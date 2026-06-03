/**
 * SparkScan — client Claude Messages API (shared).
 *
 * Centralisé pour : young-site-analyzer, qualifier, enricher, synthesizer.
 * Modèle utilisé : claude-sonnet-4-6 (rapide + économique, suffit pour ces tâches).
 *
 * Pricing officiel Sonnet 4.6 (au 25/05/2026) :
 *   - $3  / 1M input tokens
 *   - $15 / 1M output tokens
 */

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-6'
export const CLAUDE_PRICE_INPUT_PER_M = 3
export const CLAUDE_PRICE_OUTPUT_PER_M = 15
const DEFAULT_TIMEOUT_MS = 60_000

export interface ClaudeJsonOptions {
  /** Prompt utilisateur. Doit inclure les instructions de format JSON strict. */
  prompt: string
  /** Max tokens de la réponse. Default 1024, augmente pour synthèse. */
  maxTokens?: number
  /** Timeout réseau en ms. */
  timeoutMs?: number
  /** Label pour les logs serveur (ex : "qualifier", "enricher"). */
  label?: string
}

export interface ClaudeJsonResult<T> {
  json: T
  inputTokens: number
  outputTokens: number
  costUsd: number
}

import { retryable } from './retry'

/**
 * Call Claude with a prompt that must return JSON, parse it, and return both
 * the parsed object and the token usage / dollar cost.
 *
 * Tolerates Claude wrapping its JSON in ```json ... ``` fences.
 *
 * RETRY : en cas d'erreur réseau, timeout, ou HTTP 5xx, retente 1× après 2s.
 * Les erreurs 4xx (auth, mauvais payload) ne sont PAS retentées.
 */
export async function callClaudeJson<T>(
  opts: ClaudeJsonOptions,
): Promise<ClaudeJsonResult<T>> {
  return retryable(() => callClaudeJsonOnce<T>(opts), opts.label ?? 'Claude')
}

async function callClaudeJsonOnce<T>(
  opts: ClaudeJsonOptions,
): Promise<ClaudeJsonResult<T>> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY env var requise')

  const { prompt, maxTokens = 1024, timeoutMs = DEFAULT_TIMEOUT_MS, label } = opts
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
  const json = parseJsonResponse<T>(textBlock, tag)
  const inputTokens = body.usage.input_tokens
  const outputTokens = body.usage.output_tokens
  const costUsd =
    (inputTokens / 1_000_000) * CLAUDE_PRICE_INPUT_PER_M +
    (outputTokens / 1_000_000) * CLAUDE_PRICE_OUTPUT_PER_M
  console.log(
    `${tag} in=${inputTokens} out=${outputTokens} cost=$${costUsd.toFixed(4)}`,
  )
  return { json, inputTokens, outputTokens, costUsd }
}

function parseJsonResponse<T>(text: string, tag: string): T {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
  try {
    return JSON.parse(cleaned) as T
  } catch (err) {
    throw new Error(
      `${tag} JSON parse failed: ${(err as Error).message}. Reçu (300 chars) : ${text.slice(0, 300)}`,
    )
  }
}
