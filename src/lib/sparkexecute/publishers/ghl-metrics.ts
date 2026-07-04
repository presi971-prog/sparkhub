/**
 * Métriques business GHL — pour le récap hebdomadaire de visibilité.
 *
 * La page Suivi et le récap hebdo mesurent la visibilité (score IA, mots-clés,
 * rang). Mais la visibilité n'est qu'un moyen : ce qui compte, c'est si elle
 * se transforme en conversations et en rendez-vous. Ce module lit les VRAIS
 * chiffres GHL (pas une estimation) pour les faire apparaître à côté du score.
 *
 * Doc officielle GHL :
 *   - Calendar Events : https://marketplace.gohighlevel.com/docs/ghl/calendars/get-calendar-events
 *   - Conversations Search : https://marketplace.gohighlevel.com/docs/ghl/conversations/search-conversation
 */

import { GHL_DCGAI_LOCATION_ID, ghlFetch } from './ghl-client'

/**
 * Calendriers qui représentent une VRAIE démo réservée par un prospect
 * (signal d'acquisition), par opposition aux calendriers internes
 * (onboarding client déjà signé, formation, relance). Noms confirmés en
 * réel le 04/07/2026 dans la location GHL DCG AI.
 */
const DEMO_CALENDAR_IDS = [
  'dnA3ku6jDdsdYvbl1yfc', // Personalized Demo
  'nXqIpLpbbDdZtYHZORbR', // DEMO
]

/** Statuts d'appointment GHL qui comptent comme "RDV pris" (on exclut les annulés). */
const COUNTED_APPOINTMENT_STATUSES = new Set(['confirmed', 'new', 'showed'])

interface GhlCalendarEvent {
  startTime: string
  title?: string
  appointmentStatus?: string
}

/**
 * Compte les RDV de démo pris sur une fenêtre de temps donnée, tous
 * calendriers de démo confondus. Ne throw jamais : une erreur GHL renvoie
 * `null` (le récap l'affichera comme "non mesurable" plutôt que de bloquer
 * l'email).
 */
export async function countDemoAppointments(
  sinceMs: number,
  untilMs: number,
): Promise<number | null> {
  try {
    let total = 0
    for (const calendarId of DEMO_CALENDAR_IDS) {
      const data = await ghlFetch<{ events?: GhlCalendarEvent[] }>(
        `/calendars/events?locationId=${GHL_DCGAI_LOCATION_ID}&calendarId=${calendarId}&startTime=${sinceMs}&endTime=${untilMs}`,
      )
      const events = data.events ?? []
      total += events.filter(
        (e) => !e.appointmentStatus || COUNTED_APPOINTMENT_STATUSES.has(e.appointmentStatus),
      ).length
    }
    return total
  } catch (err) {
    console.error(
      `[ghl-metrics] countDemoAppointments échoué (non bloquant): ${err instanceof Error ? err.message : err}`,
    )
    return null
  }
}

interface GhlConversation {
  lastMessageDate?: number
}

/**
 * Compte les conversations avec au moins un message échangé depuis `sinceMs`.
 * La recherche GHL est triée par défaut du plus récent au plus ancien : on
 * pagine seulement tant que nécessaire et on s'arrête dès qu'une conversation
 * est plus vieille que la fenêtre (borne le nombre d'appels API).
 */
export async function countActiveConversations(sinceMs: number): Promise<number | null> {
  try {
    let count = 0
    let skip = 0
    const pageSize = 50
    const maxPages = 10 // borne dure : jamais plus de 500 conversations scannées

    for (let page = 0; page < maxPages; page++) {
      const data = await ghlFetch<{ conversations?: GhlConversation[]; total?: number }>(
        `/conversations/search?locationId=${GHL_DCGAI_LOCATION_ID}&limit=${pageSize}&skip=${skip}&sort=desc&sortBy=last_message_date`,
      )
      const conversations = data.conversations ?? []
      if (conversations.length === 0) break

      let hitOlder = false
      for (const c of conversations) {
        if (!c.lastMessageDate || c.lastMessageDate < sinceMs) {
          hitOlder = true
          break
        }
        count++
      }
      if (hitOlder || conversations.length < pageSize) break
      skip += pageSize
    }
    return count
  } catch (err) {
    console.error(
      `[ghl-metrics] countActiveConversations échoué (non bloquant): ${err instanceof Error ? err.message : err}`,
    )
    return null
  }
}

export interface BusinessMetrics {
  demoAppointments: number | null
  activeConversations: number | null
  windowDays: number
}

/** Chiffres business des `windowDays` derniers jours (7 par défaut = 1 semaine). */
export async function fetchBusinessMetrics(windowDays: number = 7): Promise<BusinessMetrics> {
  const now = Date.now()
  const since = now - windowDays * 86_400_000
  const [demoAppointments, activeConversations] = await Promise.all([
    countDemoAppointments(since, now),
    countActiveConversations(since),
  ])
  return { demoAppointments, activeConversations, windowDays }
}
