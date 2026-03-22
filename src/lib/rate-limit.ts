/**
 * Rate limiter in-memory pour Vercel serverless.
 * Limite les requêtes par clé (user ID ou IP).
 *
 * Note : En serverless, chaque instance a son propre cache.
 * Pour un rate limiting strict, migrer vers @upstash/ratelimit + Redis.
 * Ceci couvre déjà 90% des cas d'abus (bot, scripts, refresh spam).
 */

const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

// Nettoyage périodique des entrées expirées
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitMap) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key)
    }
  }
}, 60_000)

interface RateLimitResult {
  success: boolean
  remaining: number
  resetIn: number
}

/**
 * Vérifie et applique le rate limit.
 * @param key - Identifiant unique (user ID, IP, etc.)
 * @param maxRequests - Nombre max de requêtes dans la fenêtre
 * @param windowMs - Fenêtre de temps en millisecondes
 */
export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now()
  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs })
    return { success: true, remaining: maxRequests - 1, resetIn: windowMs }
  }

  entry.count++

  if (entry.count > maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetIn: entry.resetTime - now,
    }
  }

  return {
    success: true,
    remaining: maxRequests - entry.count,
    resetIn: entry.resetTime - now,
  }
}

/**
 * Extrait l'identifiant pour le rate limit (user ID ou IP).
 */
export function getRateLimitKey(req: Request, userId?: string): string {
  if (userId) return `user:${userId}`
  const forwarded = req.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown'
  return `ip:${ip}`
}
