/**
 * SparkPilot Chat — client Claude Messages API en mode streaming SSE.
 *
 * Pourquoi un client séparé de `lib/sparkscan/claude.ts` :
 *   - claude.ts attend une réponse JSON complète (parsing + retry) →
 *     pas adapté au stream token par token.
 *   - Ici on veut un AsyncIterable de deltas texte + le total tokens à la fin
 *     pour mettre à jour le compteur d'usage.
 *
 * Modèle utilisé : claude-sonnet-4-6 (cohérent avec le reste de Sparkscan).
 * Pricing : $3 / 1M input tokens, $15 / 1M output tokens.
 *
 * Spec officielle SSE Anthropic :
 *   https://docs.anthropic.com/en/api/messages-streaming
 * Events utilisés ici :
 *   - content_block_delta (text_delta.text)  → texte qui arrive
 *   - message_delta (usage)                  → tokens output cumulés
 *   - message_start (message.usage)          → tokens input
 *   - error                                  → erreur côté Anthropic
 */

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-6'

export const CLAUDE_PRICE_INPUT_PER_M = 3
export const CLAUDE_PRICE_OUTPUT_PER_M = 15

/** Message tel que stocké dans la BDD et envoyé à Claude. */
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  /** ISO 8601. Optionnel — Claude n'en a pas besoin, mais c'est dans le jsonb. */
  created_at?: string
}

export interface ClaudeStreamOptions {
  systemPrompt: string
  messages: ChatMessage[]
  /** Max tokens de la réponse coach. Default 1024 (réponses courtes). */
  maxTokens?: number
  /** Timeout réseau global. */
  timeoutMs?: number
  /** Label pour les logs. */
  label?: string
}

/** Résultat final d'un stream (cumul après itération complète). */
export interface ClaudeStreamUsage {
  inputTokens: number
  outputTokens: number
  costUsd: number
}

/** Événement emit côté caller pendant le stream. */
export type ClaudeStreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; usage: ClaudeStreamUsage; fullText: string }
  | { type: 'error'; error: string }

/**
 * Lance un appel Claude en streaming et yield les deltas + l'usage final.
 *
 * Usage :
 *   ```
 *   for await (const ev of streamClaudeChat({ systemPrompt, messages })) {
 *     if (ev.type === 'delta') sendToClient(ev.text)
 *     else if (ev.type === 'done') saveUsage(ev.usage)
 *     else if (ev.type === 'error') handleError(ev.error)
 *   }
 *   ```
 *
 * Gère les erreurs réseau, HTTP 4xx/5xx, et événements SSE malformés
 * sans crasher — yield juste un event `error` puis termine.
 */
export async function* streamClaudeChat(
  opts: ClaudeStreamOptions,
): AsyncGenerator<ClaudeStreamEvent, void, unknown> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    yield { type: 'error', error: 'ANTHROPIC_API_KEY env var requise' }
    return
  }

  const {
    systemPrompt,
    messages,
    maxTokens = 1024,
    timeoutMs = 90_000,
    label,
  } = opts
  const tag = label ? `[Claude/${label}]` : '[Claude/chat]'

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
        accept: 'text/event-stream',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        stream: true,
      }),
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timeout)
    const msg = err instanceof Error ? err.message : String(err)
    yield { type: 'error', error: `${tag} fetch failed: ${msg}` }
    return
  }

  if (!res.ok) {
    clearTimeout(timeout)
    const text = await res.text().catch(() => '')
    yield {
      type: 'error',
      error: `${tag} HTTP ${res.status}: ${text.slice(0, 400)}`,
    }
    return
  }

  if (!res.body) {
    clearTimeout(timeout)
    yield { type: 'error', error: `${tag} pas de body de réponse` }
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let inputTokens = 0
  let outputTokens = 0
  let fullText = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // SSE = blocs séparés par "\n\n". On parse ligne par ligne pour
      // extraire les `event:` et `data:` puis on dispatch.
      let sepIdx: number
      while ((sepIdx = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, sepIdx)
        buffer = buffer.slice(sepIdx + 2)

        const dataLines = block
          .split('\n')
          .filter((l) => l.startsWith('data:'))
          .map((l) => l.slice(5).trim())
        if (dataLines.length === 0) continue

        const dataStr = dataLines.join('\n')
        if (dataStr === '[DONE]') continue

        let parsed: unknown
        try {
          parsed = JSON.parse(dataStr)
        } catch {
          // Bloc SSE malformé : on ignore pour ne pas casser le stream.
          continue
        }

        const evObj = parsed as {
          type?: string
          delta?: { type?: string; text?: string }
          content_block?: { type?: string; text?: string }
          message?: { usage?: { input_tokens?: number; output_tokens?: number } }
          usage?: { input_tokens?: number; output_tokens?: number }
          error?: { message?: string }
        }

        // 1. Tokens input (présent dans message_start)
        if (evObj.type === 'message_start' && evObj.message?.usage) {
          inputTokens = evObj.message.usage.input_tokens ?? 0
          // L'API renvoie aussi output_tokens=0 ici, on l'ignore.
        }

        // 2. Texte qui arrive (content_block_delta avec text_delta)
        if (
          evObj.type === 'content_block_delta' &&
          evObj.delta?.type === 'text_delta' &&
          typeof evObj.delta.text === 'string'
        ) {
          fullText += evObj.delta.text
          yield { type: 'delta', text: evObj.delta.text }
        }

        // 3. Texte présent direct dans content_block_start (rare avec
        //    text mais on garde la robustesse)
        if (
          evObj.type === 'content_block_start' &&
          evObj.content_block?.type === 'text' &&
          typeof evObj.content_block.text === 'string' &&
          evObj.content_block.text.length > 0
        ) {
          fullText += evObj.content_block.text
          yield { type: 'delta', text: evObj.content_block.text }
        }

        // 4. Tokens output cumulés (message_delta.usage)
        if (evObj.type === 'message_delta' && evObj.usage) {
          // Anthropic envoie le cumul final, on remplace.
          if (typeof evObj.usage.output_tokens === 'number') {
            outputTokens = evObj.usage.output_tokens
          }
          if (typeof evObj.usage.input_tokens === 'number') {
            inputTokens = evObj.usage.input_tokens
          }
        }

        // 5. Erreur signalée par Anthropic
        if (evObj.type === 'error' && evObj.error?.message) {
          yield { type: 'error', error: `${tag} ${evObj.error.message}` }
          clearTimeout(timeout)
          return
        }
      }
    }
  } finally {
    clearTimeout(timeout)
  }

  const costUsd =
    (inputTokens / 1_000_000) * CLAUDE_PRICE_INPUT_PER_M +
    (outputTokens / 1_000_000) * CLAUDE_PRICE_OUTPUT_PER_M

  console.info(
    `${tag} stream done — in=${inputTokens} out=${outputTokens} cost=$${costUsd.toFixed(
      4,
    )} chars=${fullText.length}`,
  )

  yield {
    type: 'done',
    usage: { inputTokens, outputTokens, costUsd },
    fullText,
  }
}
