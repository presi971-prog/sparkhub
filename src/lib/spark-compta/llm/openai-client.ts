/**
 * Spark Compta — Client OpenAI minimal
 *
 * Wrapper fetch léger autour de l'API Chat Completions d'OpenAI.
 * Pas de dépendance npm, juste fetch natif + types TypeScript précis.
 *
 * Supporte les Structured Outputs via `response_format: { type: 'json_schema' }`
 * pour garantir que le LLM retourne du JSON conforme à un schéma.
 */

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const DEFAULT_MODEL = 'gpt-4o-mini'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface JsonSchemaFormat {
  type: 'json_schema'
  json_schema: {
    name: string
    description?: string
    strict?: boolean
    schema: Record<string, unknown>
  }
}

export interface ChatCompletionOptions {
  messages: ChatMessage[]
  model?: string
  temperature?: number
  max_tokens?: number
  response_format?: JsonSchemaFormat | { type: 'json_object' } | { type: 'text' }
}

export interface ChatCompletionResult<T = string> {
  content: T
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  model: string
}

/**
 * Appel basique à l'API Chat Completions.
 * Lève une erreur si l'appel échoue ou si la réponse est malformée.
 */
export async function chatCompletion<T = string>(
  options: ChatCompletionOptions
): Promise<ChatCompletionResult<T>> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY manquante dans les variables d\'environnement')
  }

  const body: Record<string, unknown> = {
    model: options.model ?? DEFAULT_MODEL,
    messages: options.messages,
    temperature: options.temperature ?? 0.2,
  }

  if (options.max_tokens !== undefined) {
    body.max_tokens = options.max_tokens
  }

  if (options.response_format) {
    body.response_format = options.response_format
  }

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `OpenAI API error ${response.status}: ${errorText.slice(0, 500)}`
    )
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>
    usage: {
      prompt_tokens: number
      completion_tokens: number
      total_tokens: number
    }
    model: string
  }

  const rawContent = data.choices?.[0]?.message?.content
  if (!rawContent) {
    throw new Error('OpenAI a retourné une réponse sans contenu')
  }

  // Si response_format est json_schema ou json_object, parser automatiquement
  const isJson =
    options.response_format?.type === 'json_schema' ||
    options.response_format?.type === 'json_object'

  let content: T
  if (isJson) {
    try {
      content = JSON.parse(rawContent) as T
    } catch (error) {
      throw new Error(
        `OpenAI a retourné du JSON invalide : ${rawContent.slice(0, 300)}`
      )
    }
  } else {
    content = rawContent as unknown as T
  }

  return {
    content,
    usage: data.usage,
    model: data.model,
  }
}
