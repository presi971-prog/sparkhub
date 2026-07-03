/**
 * SparkPilot — chargement du playbook stratégique.
 *
 * Le playbook (markdown) est la source de vérité unique pour la décomposition
 * d'une priorité SparkScan en tâches. On le lit côté serveur uniquement
 * (Node runtime, jamais Edge) via fs.readFile.
 *
 * Versioning : bump `PLAYBOOK_VERSION` à chaque mise à jour du markdown
 * (cf. section "Versioning" du markdown). La version est stockée dans
 * `metadata.playbook_version` de chaque tâche → traçabilité dans le temps.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'

/** Version du playbook courant. À bumper en même temps que le markdown. */
export const PLAYBOOK_VERSION = 'v2.0'

/** Catégories autorisées du playbook (cf. section "Catégories de priorités SparkScan"). */
export const PLAYBOOK_CATEGORIES = [
  'Visibilité IA',
  'Conversion site / page d\'accueil',
  'Contenu de fond',
  'Présence sociale',
  'Acquisition payante',
] as const

export type PlaybookCategory = (typeof PLAYBOOK_CATEGORIES)[number]

/** Chemin absolu du fichier markdown (process.cwd() = racine du projet Next.js). */
const PLAYBOOK_FILE = path.join(
  process.cwd(),
  'src',
  'lib',
  'sparkpilot',
  'playbooks',
  'playbook-strategies-v2.md',
)

/** Cache process-wide : on lit le markdown 1× par instance serveur. */
let cachedPlaybook: string | null = null

/**
 * Charge le contenu du playbook markdown.
 *
 * Server-only — appeler depuis une Server Component, Server Action ou
 * Route Handler (Node runtime). Échoue silencieusement côté client.
 *
 * @returns Contenu markdown brut du playbook.
 * @throws Error si le fichier est introuvable ou illisible.
 */
export async function loadPlaybook(): Promise<string> {
  if (cachedPlaybook !== null) return cachedPlaybook
  try {
    const content = await fs.readFile(PLAYBOOK_FILE, 'utf-8')
    cachedPlaybook = content
    return content
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(
      `[SparkPilot/playbook] Lecture du playbook ${PLAYBOOK_VERSION} échouée : ${msg}`,
    )
  }
}
