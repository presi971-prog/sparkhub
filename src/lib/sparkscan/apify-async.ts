/**
 * SparkScan — appel asynchrone d'un acteur Apify (pattern run + poll + dataset).
 *
 * Pourquoi ce mode et pas `run-sync-get-dataset-items` ?
 * → undici (le client fetch de Node.js) ferme automatiquement les sockets
 *   keep-alive après ~60s d'idle (UND_ERR_SOCKET). Or les actors Apify lourds
 *   (Google Maps, scrapers RS) mettent souvent 1-5 min à finir. La connexion
 *   sync casse donc avant la réponse. Pas un bug Next.js : reproduit en Node
 *   pur (test 27/05/2026 = échec à 60.8s sur la même charge).
 *
 * Solution : 3 appels HTTP courts au lieu d'1 long :
 *   1. POST /v2/acts/{actor}/runs              → run_id + dataset_id (~2s)
 *   2. GET  /v2/actor-runs/{run_id}            → status (loop chaque 10s)
 *   3. GET  /v2/datasets/{dataset_id}/items    → résultats (~2s)
 *
 * Aucun appel ne dure plus de quelques secondes → aucun risque de timeout
 * socket. Le pipeline reste résilient (retry géré par l'appelant).
 *
 * Doc Apify :
 *   - https://docs.apify.com/api/v2/act-runs-post
 *   - https://docs.apify.com/api/v2/actor-run-get
 *   - https://docs.apify.com/api/v2/dataset-items-get
 */

const APIFY_BASE = 'https://api.apify.com/v2'
const POLL_INTERVAL_MS = 8_000
const HTTP_TIMEOUT_MS = 20_000 // chaque appel court doit finir en <20s

function apifyToken(): string {
  const token = process.env.APIFY_TOKEN
  if (!token) throw new Error('APIFY_TOKEN env var requise')
  return token
}

export interface RunApifyOptions {
  /** Plafond global d'attente (poll inclus). Default 10 min. */
  maxWaitMs?: number
  /** Label pour les logs. */
  label?: string
}

interface RunStartResponse {
  data: {
    id: string
    actId: string
    defaultDatasetId: string
    status: string
  }
}

interface RunStatusResponse {
  data: {
    id: string
    status:
      | 'READY'
      | 'RUNNING'
      | 'SUCCEEDED'
      | 'FAILED'
      | 'TIMING-OUT'
      | 'TIMED-OUT'
      | 'ABORTING'
      | 'ABORTED'
    defaultDatasetId: string
  }
}

async function shortFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        ...(init.headers ?? {}),
        'User-Agent': 'SparkScan/1.0',
        Accept: 'application/json',
      },
    })
    clearTimeout(timeout)
    return res
  } catch (err) {
    clearTimeout(timeout)
    throw err
  }
}

/**
 * Lance un acteur Apify en mode async + récupère les résultats.
 * Throw une erreur claire si le run échoue, time-out, ou si le poll dépasse maxWaitMs.
 */
export async function runApifyActorAsync<T = unknown>(
  actorSlug: string,
  input: object,
  opts: RunApifyOptions = {},
): Promise<T[]> {
  const tag = `[Apify/${opts.label ?? actorSlug}]`
  const maxWaitMs = opts.maxWaitMs ?? 600_000

  // 1. Démarrer le run
  const startUrl = `${APIFY_BASE}/acts/${actorSlug}/runs?token=${apifyToken()}`
  console.log(`${tag} POST runs ...`)
  const startRes = await shortFetch(startUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!startRes.ok) {
    const txt = await startRes.text()
    throw new Error(
      `${tag} run start HTTP ${startRes.status}: ${txt.slice(0, 250)}`,
    )
  }
  const startBody = (await startRes.json()) as RunStartResponse
  const runId = startBody.data.id
  const datasetId = startBody.data.defaultDatasetId
  console.log(`${tag} run started id=${runId} dataset=${datasetId}`)

  // 2. Poll jusqu'à terminal status (SUCCEEDED / FAILED / *TIMED-OUT* / *ABORTED*)
  const pollStart = Date.now()
  let finalStatus: RunStatusResponse['data']['status'] | null = null
  while (Date.now() - pollStart < maxWaitMs) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
    const statusUrl = `${APIFY_BASE}/actor-runs/${runId}?token=${apifyToken()}`
    let statusRes: Response
    try {
      statusRes = await shortFetch(statusUrl)
    } catch (err) {
      // Erreur réseau ponctuelle sur le poll : on continue, ce n'est pas fatal.
      console.warn(`${tag} poll error: ${err instanceof Error ? err.message : err}`)
      continue
    }
    if (!statusRes.ok) {
      console.warn(`${tag} poll HTTP ${statusRes.status}, continue`)
      continue
    }
    const sb = (await statusRes.json()) as RunStatusResponse
    if (
      sb.data.status === 'SUCCEEDED' ||
      sb.data.status === 'FAILED' ||
      sb.data.status === 'TIMED-OUT' ||
      sb.data.status === 'ABORTED'
    ) {
      finalStatus = sb.data.status
      console.log(
        `${tag} run finished status=${sb.data.status} elapsed=${((Date.now() - pollStart) / 1000).toFixed(1)}s`,
      )
      break
    }
    console.log(`${tag} poll status=${sb.data.status}`)
  }

  if (!finalStatus) {
    throw new Error(
      `${tag} timeout côté code après ${(maxWaitMs / 1000).toFixed(0)}s (run encore en cours côté Apify)`,
    )
  }
  if (finalStatus !== 'SUCCEEDED') {
    throw new Error(`${tag} run ${finalStatus}`)
  }

  // 3. Récupérer les items du dataset
  const dataUrl = `${APIFY_BASE}/datasets/${datasetId}/items?token=${apifyToken()}&format=json`
  const dataRes = await shortFetch(dataUrl)
  if (!dataRes.ok) {
    const txt = await dataRes.text()
    throw new Error(
      `${tag} dataset HTTP ${dataRes.status}: ${txt.slice(0, 250)}`,
    )
  }
  const items = (await dataRes.json()) as T[]
  console.log(`${tag} dataset items=${items.length}`)
  return items
}
