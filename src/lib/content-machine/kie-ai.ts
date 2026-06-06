const KIE_API_KEY = process.env.KIE_API_KEY!
const KIE_BASE_URL = 'https://api.kie.ai/api/v1/jobs'

const POLL_INTERVAL_MS = 3000
const MAX_POLL_TIME_MS = 120000

interface KieTaskResponse {
  code: number
  msg: string
  data: {
    taskId: string
  }
}

interface KieRecordInfo {
  code: number
  msg: string
  data: {
    taskId: string
    model: string
    state: string
    resultJson?: string
    failCode?: string
    failMsg?: string
    progress?: number
  }
}

/**
 * Cree une tache de generation d'image sur Kie AI (Nano Banana Pro).
 * Retourne le taskId.
 */
export async function createKieImageTask(prompt: string, aspectRatio: string = '1:1'): Promise<string> {
  const response = await fetch(`${KIE_BASE_URL}/createTask`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KIE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'nano-banana-pro',
      input: {
        prompt,
        aspect_ratio: aspectRatio,
        resolution: '1K',
        output_format: 'png',
      },
    }),
  })

  if (response.status === 402) {
    throw new Error('KIE_NO_CREDITS: Plus de credits Kie AI disponibles')
  }
  if (response.status === 429) {
    throw new Error('KIE_RATE_LIMIT: Trop de requetes Kie AI, reessayez plus tard')
  }
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`KIE_CREATE_ERROR: ${response.status} - ${text}`)
  }

  const result: KieTaskResponse = await response.json()
  console.log('[KIE] Task created:', result.data.taskId)
  return result.data.taskId
}

/**
 * Poll le statut d'une tache Kie AI jusqu'a completion ou timeout.
 * Retourne les URLs des images generees.
 */
export async function pollKieTask(taskId: string): Promise<string[]> {
  const startTime = Date.now()

  while (Date.now() - startTime < MAX_POLL_TIME_MS) {
    const response = await fetch(
      `${KIE_BASE_URL}/recordInfo?taskId=${taskId}`,
      {
        headers: {
          'Authorization': `Bearer ${KIE_API_KEY}`,
        },
      }
    )

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`KIE_POLL_ERROR: ${response.status} - ${text}`)
    }

    const result: KieRecordInfo = await response.json()
    const state = result.data.state
    console.log(`[KIE] Poll ${taskId}: state=${state}, progress=${result.data.progress || 'N/A'}`)

    if (state === 'success') {
      // resultJson est une STRING JSON qu'il faut parser
      if (!result.data.resultJson) {
        throw new Error('KIE_NO_RESULT: Tache terminee mais resultJson vide')
      }
      try {
        const parsed = JSON.parse(result.data.resultJson)
        const urls = parsed.resultUrls || parsed.result_urls || parsed.images || []
        if (Array.isArray(urls) && urls.length > 0) {
          return urls
        }
        // Si pas de resultUrls, chercher dans d'autres formats possibles
        if (typeof parsed === 'string') return [parsed]
        if (parsed.url) return [parsed.url]
        if (parsed.output) return [parsed.output]
        throw new Error(`KIE_NO_RESULT: Format resultJson inconnu: ${result.data.resultJson.substring(0, 200)}`)
      } catch (e) {
        if (e instanceof SyntaxError) {
          // resultJson n'est pas du JSON, c'est peut-être une URL directe
          if (result.data.resultJson.startsWith('http')) {
            return [result.data.resultJson]
          }
          throw new Error(`KIE_PARSE_ERROR: resultJson n'est pas du JSON valide: ${result.data.resultJson.substring(0, 200)}`)
        }
        throw e
      }
    }

    if (state === 'fail' || state === 'failed') {
      throw new Error(`KIE_TASK_FAILED: ${result.data.failMsg || 'La generation d\'image a echoue'}`)
    }

    // Attendre avant le prochain poll
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
  }

  throw new Error('KIE_TIMEOUT: La generation d\'image a depasse le delai de 60 secondes')
}

/**
 * Genere une image via Kie AI : cree la tache puis poll jusqu'au resultat.
 * Retourne les URLs des images generees.
 */
export async function generateKieImage(prompt: string, aspectRatio: string = '1:1'): Promise<string[]> {
  const taskId = await createKieImageTask(prompt, aspectRatio)
  return pollKieTask(taskId)
}

/**
 * Genere un clip video via Kie AI Veo 3 (image-to-video ou text-to-video).
 * Retourne les URLs des videos generees.
 */
export async function generateKieVideo(
  prompt: string,
  imageUrl?: string,
  model: string = 'veo3_fast'
): Promise<string[]> {
  const body: Record<string, unknown> = {
    prompt,
    model,
    aspect_ratio: '1:1',
    enableTranslation: false,
    generationType: imageUrl ? 'REFERENCE_2_VIDEO' : 'TEXT_2_VIDEO',
  }
  if (imageUrl) {
    body.imageUrls = [imageUrl]
  }

  const response = await fetch('https://api.kie.ai/api/v1/veo/generate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KIE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (response.status === 402) {
    throw new Error('KIE_NO_CREDITS: Plus de credits Kie AI')
  }
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`KIE_VIDEO_ERROR: ${response.status} - ${text}`)
  }

  const result = await response.json()
  console.log('[KIE] Video task created:', result.data?.taskId)

  // Veo utilise le même endpoint de polling
  return pollKieTask(result.data.taskId)
}

/**
 * Genere une image via Kie AI avec une image de reference (logo, photo existante).
 * Utilise Nano Banana Pro en mode image-to-image pour integrer le branding.
 */
export async function generateKieImageWithRef(prompt: string, imageUrl: string, aspectRatio: string = '1:1'): Promise<string[]> {
  const response = await fetch(`${KIE_BASE_URL}/createTask`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KIE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'nano-banana-pro',
      input: {
        prompt,
        image_input: [imageUrl],
        aspect_ratio: aspectRatio,
        resolution: '1K',
        output_format: 'png',
      },
    }),
  })

  if (response.status === 402) {
    throw new Error('KIE_NO_CREDITS: Plus de credits Kie AI disponibles')
  }
  if (response.status === 429) {
    throw new Error('KIE_RATE_LIMIT: Trop de requetes Kie AI, reessayez plus tard')
  }
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`KIE_CREATE_ERROR: ${response.status} - ${text}`)
  }

  const result: KieTaskResponse = await response.json()
  console.log('[KIE] Task created (with ref):', result.data.taskId)
  return pollKieTask(result.data.taskId)
}
