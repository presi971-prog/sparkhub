/**
 * SparkScan — retry helper partagé.
 *
 * Retente 1× après 2s en cas d'erreur transitoire :
 *   - HTTP 5xx (serveur API en panne temporaire)
 *   - timeout / aborted (lenteur réseau)
 *   - fetch failed / ENOTFOUND / ECONNRESET (problème DNS/TCP)
 *
 * NE retente PAS les erreurs 4xx (auth, payload invalide, quota saturé).
 */

const MAX_RETRIES = 1
const RETRY_DELAY_MS = 2000

export async function retryable<T>(
  fn: () => Promise<T>,
  label: string,
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      const msg = err instanceof Error ? err.message : String(err)
      const transient =
        /HTTP 5\d\d|timeout|aborted|ENOTFOUND|ECONNRESET|fetch failed/i.test(msg)
      if (!transient || attempt === MAX_RETRIES) throw err
      console.warn(
        `[${label}] erreur transitoire (${msg.slice(0, 100)}), retry dans ${RETRY_DELAY_MS}ms (tentative ${attempt + 1}/${MAX_RETRIES + 1})`,
      )
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
    }
  }
  throw lastError
}
