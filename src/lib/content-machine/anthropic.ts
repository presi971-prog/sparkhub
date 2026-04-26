const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!
const ANTHROPIC_BASE_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-4-5-20251001'

interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AnthropicResponse {
  content: Array<{
    type: 'text'
    text: string
  }>
}

/**
 * Appel a l'API Anthropic avec Claude Haiku pour la generation de contenu.
 * Cost-efficient pour la generation de texte en volume.
 */
export async function callClaude(
  systemPrompt: string,
  messages: AnthropicMessage[],
  maxTokens: number = 2000
): Promise<string> {
  const response = await fetch(ANTHROPIC_BASE_URL, {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`ANTHROPIC_ERROR: ${response.status} - ${text}`)
  }

  const result: AnthropicResponse = await response.json()
  return result.content[0]?.text || ''
}

/**
 * Appel simplifie : un seul user message.
 */
export async function askClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 2000
): Promise<string> {
  return callClaude(systemPrompt, [{ role: 'user', content: userMessage }], maxTokens)
}
