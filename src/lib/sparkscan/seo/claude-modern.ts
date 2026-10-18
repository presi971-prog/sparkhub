import type { ClaudeJsonResult } from '../claude'
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const DEFAULT_TIMEOUT_MS = 60_000

export interface ClaudeJsonModernOptions {
  model: 'claude-sonnet-5-5' | 'claude-opus-5-5'
  effort?: 'low' | 'medium' | 'high'
  /** Demande contenant le format JSON strict attendu. */
  prompt: string
  /** Max tokens de la réponse. Défaut 1024, augmenter pour une synthèse. */
  maxTokens?: number
  /** Délai maximal réseau en millisecondes. */
  timeoutMs?: number
  /** Libellé pour les journaux serveur (ex : "qualifier", "enricher"). */
  label?: string
}

import { retryable } from '../retry'

/**
 * Appelle le modèle récent et extrait le premier bloc texte, après la réflexion.
 * Retente une fois les erreurs réseau et accepte les balises de code JSON.
 */
export async function callClaudeJsonModern<T>(
  opts: ClaudeJsonModernOptions,
): Promise<ClaudeJsonResult<T>> {
  return retryable(() => callClaudeJsonModernOnce<T>(opts), opts.label ?? 'Claude')
}

async function callClaudeJsonModernOnce<T>(
  opts: ClaudeJsonModernOptions,
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
        'anthropic-beta': 'server-side-fallback-2026-07-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: opts.model,
        output_config: { effort: opts.effort ?? 'medium' },
        fallbacks: 'default',
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
    stop_reason?: string
    content: { type: string; text: string }[]
    usage: { input_tokens: number; output_tokens: number }
  }
  if (body.stop_reason === 'refusal') throw new Error(`${tag} refus du modèle`)
  const textBlock = body.content.find((c) => c.type === 'text')?.text ?? ''
  const inputTokens = body.usage.input_tokens
  const outputTokens = body.usage.output_tokens
  const costUsd =
    (inputTokens / 1_000_000) * (opts.model === 'claude-sonnet-5-5' ? 2 : 4) +
    (outputTokens / 1_000_000) * (opts.model === 'claude-sonnet-5-5' ? 10 : 20)
  console.log(
    `${tag} in=${inputTokens} out=${outputTokens} cost=$${costUsd.toFixed(4)}`,
  )
  let json: T
  try { json = parseJsonResponse<T>(textBlock, tag) }
  catch (error) { throw Object.assign(error instanceof Error ? error : new Error(String(error)), { costUsd }) }
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
