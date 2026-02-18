import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const KIE_API_KEY = process.env.KIE_API_KEY!
const FAL_KEY = process.env.FAL_KEY!

// ═══════════════════════════════════════════════════════════════
// Types internes
// ═══════════════════════════════════════════════════════════════

interface ImageJob {
  index: number
  status_url: string | null
  response_url: string | null
  image_url: string | null
  status: string // 'pending' | 'completed' | 'error'
  error: string | null
}

interface VideoJob {
  index: number
  status_url: string | null
  response_url: string | null
  video_url: string | null
  status: string
  error: string | null
}

interface MusicJob {
  prompt: string
  status_url: string | null
  response_url: string | null
  audio_url: string | null
  status: string
  error: string | null
}

interface MontageJob {
  status_url: string | null
  response_url: string | null
  video_url: string | null
  status: string
}

interface SparkVideoJob {
  id: string
  user_id: string
  status: string
  idea: string
  ambiance: string | null
  music_mood: string | null
  tier: string
  scenes_count: number
  duration_seconds: number
  credits_used: number
  scenes: Array<{ index: number; prompt: string }> | null
  image_jobs: ImageJob[] | null
  video_prompts: Array<{ index: number; prompt: string }> | null
  video_jobs: VideoJob[] | null
  music_job: MusicJob | null
  montage_job: MontageJob | null
  final_video_url: string | null
  error: string | null
}

// ═══════════════════════════════════════════════════════════════
// Helpers fal.ai
// ═══════════════════════════════════════════════════════════════

async function checkFalStatus(statusUrl: string): Promise<{ status: string; queue_position?: number }> {
  const res = await fetch(statusUrl, {
    headers: { 'Authorization': `Key ${FAL_KEY}` },
  })
  if (!res.ok) return { status: 'error' }
  return res.json()
}

async function getFalResult(responseUrl: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(responseUrl, {
    headers: { 'Authorization': `Key ${FAL_KEY}` },
  })
  if (!res.ok) return null
  return res.json()
}

// ═══════════════════════════════════════════════════════════════
// Orchestration : avancer le pipeline selon l'état
// ═══════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function orchestrate(
  job: SparkVideoJob,
  adminSupabase: any,
): Promise<{
  status: string
  currentStep: { name: string; completed: number; total: number }
  overallProgress: number
  finalVideoUrl?: string
  error?: string
}> {
  const stepWeights: Record<string, number> = {
    scenes: 5, images: 20, video_prompts: 5, videos: 40, music: 10, montage: 20,
  }
  const stepLabels: Record<string, string> = {
    scenes: 'Écriture du scénario',
    images: 'Génération des images',
    video_prompts: 'Création des animations',
    videos: 'Génération des clips',
    music: 'Composition musicale',
    montage: 'Montage final',
  }

  // Calcul de la progression globale
  function getProgress(currentStatus: string, stepProgress: number): number {
    const steps = ['scenes', 'images', 'video_prompts', 'videos', 'music', 'montage']
    let total = 0
    for (const step of steps) {
      if (step === currentStatus) {
        total += stepWeights[step] * stepProgress
        break
      }
      total += stepWeights[step]
    }
    return Math.min(Math.round(total), 100)
  }

  // ── IMAGES ──
  if (job.status === 'images' && job.image_jobs) {
    let changed = false
    const imageJobs = [...job.image_jobs]

    for (let i = 0; i < imageJobs.length; i++) {
      const ij = imageJobs[i]
      if (ij.status !== 'pending' || !ij.status_url) continue

      const falStatus = await checkFalStatus(ij.status_url)

      if (falStatus.status === 'COMPLETED' && ij.response_url) {
        const result = await getFalResult(ij.response_url)
        const imageUrl = (result?.images as Array<{ url: string }>)?.[0]?.url
        if (imageUrl) {
          imageJobs[i] = { ...ij, status: 'completed', image_url: imageUrl }
          changed = true
        } else {
          imageJobs[i] = { ...ij, status: 'error', error: 'Pas d\'image dans la réponse' }
          changed = true
        }
      } else if (falStatus.status === 'FAILED') {
        imageJobs[i] = { ...ij, status: 'error', error: 'Génération échouée' }
        changed = true
      }
    }

    const completed = imageJobs.filter(j => j.status === 'completed').length
    const errors = imageJobs.filter(j => j.status === 'error').length
    const pending = imageJobs.filter(j => j.status === 'pending').length
    const total = imageJobs.length

    // Toutes les images sont traitées (plus aucune en pending)
    if (pending === 0) {
      if (completed >= 2) {
        // Passer à video_prompts
        await adminSupabase
          .from('spark_video_jobs')
          .update({ status: 'video_prompts', image_jobs: imageJobs })
          .eq('id', job.id)

        return {
          status: 'video_prompts',
          currentStep: { name: stepLabels.video_prompts, completed: 0, total: completed },
          overallProgress: getProgress('video_prompts', 0),
        }
      } else {
        // Pas assez d'images → erreur + remboursement
        await handleError(job, adminSupabase, 'Trop d\'images ont échoué', imageJobs)
        return {
          status: 'error',
          currentStep: { name: stepLabels.images, completed, total },
          overallProgress: 0,
          error: 'Trop d\'images ont échoué. Crédits remboursés.',
        }
      }
    }

    if (changed) {
      await adminSupabase
        .from('spark_video_jobs')
        .update({ image_jobs: imageJobs })
        .eq('id', job.id)
    }

    return {
      status: 'images',
      currentStep: { name: stepLabels.images, completed: completed + errors, total },
      overallProgress: getProgress('images', (completed + errors) / total),
    }
  }

  // ── VIDEO_PROMPTS ──
  if (job.status === 'video_prompts' && job.image_jobs) {
    const successfulImages = job.image_jobs.filter(j => j.status === 'completed' && j.image_url)

    // Générer les prompts vidéo via Gemini
    const videoPrompts = await generateVideoPrompts(
      successfulImages,
      job.idea,
      job.ambiance,
    )

    // Soumettre les vidéos à fal.ai
    const videoJobs = await submitVideoJobs(successfulImages, videoPrompts)

    // Lancer la musique en parallèle
    const musicJob = await submitMusicJob(job.idea, job.music_mood, job.duration_seconds)

    // Mettre à jour le job
    await adminSupabase
      .from('spark_video_jobs')
      .update({
        status: 'videos',
        video_prompts: videoPrompts,
        video_jobs: videoJobs,
        music_job: musicJob,
      })
      .eq('id', job.id)

    return {
      status: 'videos',
      currentStep: { name: stepLabels.videos, completed: 0, total: videoJobs.length },
      overallProgress: getProgress('videos', 0),
    }
  }

  // ── VIDEOS + MUSIC (parallèle) ──
  if (job.status === 'videos' && job.video_jobs) {
    let changed = false
    const videoJobs = [...job.video_jobs]
    let musicJob = job.music_job ? { ...job.music_job } : null

    // Poller les vidéos
    for (let i = 0; i < videoJobs.length; i++) {
      const vj = videoJobs[i]
      if (vj.status !== 'pending' || !vj.status_url) continue

      const falStatus = await checkFalStatus(vj.status_url)

      if (falStatus.status === 'COMPLETED' && vj.response_url) {
        const result = await getFalResult(vj.response_url)
        const videoUrl = (result?.video as { url: string })?.url
        if (videoUrl) {
          videoJobs[i] = { ...vj, status: 'completed', video_url: videoUrl }
          changed = true
        } else {
          videoJobs[i] = { ...vj, status: 'error', error: 'Pas de vidéo dans la réponse' }
          changed = true
        }
      } else if (falStatus.status === 'FAILED') {
        videoJobs[i] = { ...vj, status: 'error', error: 'Génération vidéo échouée' }
        changed = true
      }
    }

    // Poller la musique
    if (musicJob && musicJob.status === 'pending' && musicJob.status_url) {
      const musicStatus = await checkFalStatus(musicJob.status_url)

      if (musicStatus.status === 'COMPLETED' && musicJob.response_url) {
        const result = await getFalResult(musicJob.response_url)
        const audioUrl = (result?.audio as { url: string })?.url
          || (result?.audio_file as { url: string })?.url
        if (audioUrl) {
          musicJob = { ...musicJob, status: 'completed', audio_url: audioUrl }
          changed = true
        } else {
          musicJob = { ...musicJob, status: 'error', error: 'Pas d\'audio dans la réponse' }
          changed = true
        }
      } else if (musicStatus.status === 'FAILED') {
        musicJob = { ...musicJob, status: 'error', error: 'Génération musique échouée' }
        changed = true
      }
    }

    const videosCompleted = videoJobs.filter(j => j.status === 'completed').length
    const videosErrors = videoJobs.filter(j => j.status === 'error').length
    const videosPending = videoJobs.filter(j => j.status === 'pending').length
    const videosTotal = videoJobs.length

    const musicDone = !musicJob || musicJob.status === 'completed' || musicJob.status === 'error'

    // Toutes les vidéos traitées ET musique terminée
    if (videosPending === 0 && musicDone) {
      if (videosCompleted >= 2) {
        // Passer au montage
        const montageJob = await submitMontageJob(videoJobs, musicJob, job.duration_seconds)

        await adminSupabase
          .from('spark_video_jobs')
          .update({
            status: 'montage',
            video_jobs: videoJobs,
            music_job: musicJob,
            montage_job: montageJob,
          })
          .eq('id', job.id)

        return {
          status: 'montage',
          currentStep: { name: stepLabels.montage, completed: 0, total: 1 },
          overallProgress: getProgress('montage', 0),
        }
      } else {
        // Pas assez de vidéos → erreur + remboursement
        await handleError(job, adminSupabase, 'Trop de clips vidéo ont échoué')
        return {
          status: 'error',
          currentStep: { name: stepLabels.videos, completed: videosCompleted, total: videosTotal },
          overallProgress: 0,
          error: 'Trop de clips vidéo ont échoué. Crédits remboursés.',
        }
      }
    }

    if (changed) {
      await adminSupabase
        .from('spark_video_jobs')
        .update({ video_jobs: videoJobs, music_job: musicJob })
        .eq('id', job.id)
    }

    return {
      status: 'videos',
      currentStep: { name: stepLabels.videos, completed: videosCompleted + videosErrors, total: videosTotal },
      overallProgress: getProgress('videos', (videosCompleted + videosErrors) / videosTotal),
    }
  }

  // ── MONTAGE ──
  if (job.status === 'montage' && job.montage_job) {
    const mj = job.montage_job

    if (mj.status === 'pending' && mj.status_url) {
      const falStatus = await checkFalStatus(mj.status_url)

      if (falStatus.status === 'COMPLETED' && mj.response_url) {
        const result = await getFalResult(mj.response_url)
        const videoUrl = (result?.video as { url: string })?.url
          || (result?.output_url as string)

        if (videoUrl) {
          await adminSupabase
            .from('spark_video_jobs')
            .update({
              status: 'completed',
              montage_job: { ...mj, status: 'completed', video_url: videoUrl },
              final_video_url: videoUrl,
            })
            .eq('id', job.id)

          return {
            status: 'completed',
            currentStep: { name: 'Terminé', completed: 1, total: 1 },
            overallProgress: 100,
            finalVideoUrl: videoUrl,
          }
        }
      } else if (falStatus.status === 'FAILED') {
        await handleError(job, adminSupabase, 'Le montage vidéo a échoué')
        return {
          status: 'error',
          currentStep: { name: stepLabels.montage, completed: 0, total: 1 },
          overallProgress: 0,
          error: 'Le montage vidéo a échoué. Crédits remboursés.',
        }
      }
    }

    return {
      status: 'montage',
      currentStep: { name: stepLabels.montage, completed: 0, total: 1 },
      overallProgress: getProgress('montage', 0.5),
    }
  }

  // ── COMPLETED ──
  if (job.status === 'completed') {
    return {
      status: 'completed',
      currentStep: { name: 'Terminé', completed: 1, total: 1 },
      overallProgress: 100,
      finalVideoUrl: job.final_video_url || undefined,
    }
  }

  // ── ERROR ──
  return {
    status: job.status,
    currentStep: { name: job.status, completed: 0, total: 0 },
    overallProgress: 0,
    error: job.error || 'État inconnu',
  }
}

// ═══════════════════════════════════════════════════════════════
// Génération des prompts vidéo via Gemini
// ═══════════════════════════════════════════════════════════════

async function generateVideoPrompts(
  images: ImageJob[],
  idea: string,
  ambiance: string | null,
): Promise<Array<{ index: number; prompt: string }>> {
  const systemPrompt = `Tu es un expert en animation vidéo. Pour chaque scène, tu crées un prompt de mouvement court (SOUS 300 caractères) décrivant ce qui se passe pendant 5 secondes.

RÈGLES :
- UNE seule action par scène (pas de séquence complexe)
- Troisième personne, pas de termes de caméra
- Décris le MOUVEMENT : ce qui bouge, comment, dans quelle direction
- Style réaliste, pas cartoon
- Prompts en ANGLAIS
- Ambiance : ${ambiance || 'adaptée à l\'idée'}

IDÉE DE LA VIDÉO : "${idea}"

FORMAT JSON UNIQUEMENT :
{"prompts":[{"index":0,"prompt":"..."},{"index":1,"prompt":"..."}]}`

  const userContent = images.map((img, i) => ({
    type: 'text' as const,
    text: `Scène ${img.index} (image générée) : crée le prompt de mouvement pour cette scène.`,
  }))

  try {
    const response = await fetch('https://api.kie.ai/gemini-3/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KIE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: [{ type: 'text', text: systemPrompt }] },
          { role: 'user', content: userContent },
        ],
        stream: false,
        include_thoughts: false,
      }),
    })

    if (!response.ok) throw new Error(`Gemini video prompts: ${response.status}`)

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''
    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleanContent)

    return (parsed.prompts || parsed.scenes || []).map((p: { index?: number; prompt: string }, i: number) => ({
      index: images[i]?.index ?? i,
      prompt: p.prompt,
    }))
  } catch (error) {
    console.error('Gemini video prompts error:', error)
    // Fallback : prompts génériques basés sur les scènes originales
    return images.map((img) => ({
      index: img.index,
      prompt: 'Gentle natural movement in the scene, subtle environmental motion, soft ambient changes over 5 seconds.',
    }))
  }
}

// ═══════════════════════════════════════════════════════════════
// Soumission des vidéos à fal.ai (kling-video)
// ═══════════════════════════════════════════════════════════════

async function submitVideoJobs(
  images: ImageJob[],
  videoPrompts: Array<{ index: number; prompt: string }>,
): Promise<VideoJob[]> {
  const results = await Promise.allSettled(
    images.map(async (img, i) => {
      const prompt = videoPrompts[i]?.prompt || 'Subtle natural movement in the scene'

      const submitResponse = await fetch(
        'https://queue.fal.run/fal-ai/kling-video/v1.6/standard/image-to-video',
        {
          method: 'POST',
          headers: {
            'Authorization': `Key ${FAL_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt,
            image_url: img.image_url,
            duration: '5',
            aspect_ratio: '9:16',
            negative_prompt: 'bad quality, blurry, distorted',
            cfg_scale: 0.5,
          }),
        }
      )

      if (!submitResponse.ok) {
        const errText = await submitResponse.text()
        throw new Error(`fal.ai kling (${submitResponse.status}): ${errText}`)
      }

      const submitData = await submitResponse.json()
      return {
        index: img.index,
        status_url: submitData.status_url || null,
        response_url: submitData.response_url || null,
        video_url: null,
        status: 'pending',
        error: null,
      }
    })
  )

  return results.map((result, i) => {
    if (result.status === 'fulfilled') return result.value
    return {
      index: images[i].index,
      status_url: null,
      response_url: null,
      video_url: null,
      status: 'error',
      error: result.reason?.message || 'Erreur soumission vidéo',
    }
  })
}

// ═══════════════════════════════════════════════════════════════
// Soumission de la musique à fal.ai (ace-step)
// ═══════════════════════════════════════════════════════════════

async function submitMusicJob(
  idea: string,
  musicMood: string | null,
  durationSec: number,
): Promise<MusicJob> {
  // Générer le prompt musique via Gemini
  let musicPrompt: string
  try {
    const response = await fetch('https://api.kie.ai/gemini-3/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KIE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: [{
              type: 'text',
              text: `Generate a concise music description for AI music generation. Maximum 250 characters. The music must be instrumental (no lyrics), pleasant, not repetitive. Include specific instruments and mood.`,
            }],
          },
          {
            role: 'user',
            content: [{
              type: 'text',
              text: `Video idea: "${idea}". Music mood: ${musicMood || 'choose the best fit'}. Duration: ${durationSec} seconds. Write ONE music description in English, under 250 characters.`,
            }],
          },
        ],
        stream: false,
        include_thoughts: false,
      }),
    })

    if (!response.ok) throw new Error(`Gemini music: ${response.status}`)
    const data = await response.json()
    musicPrompt = data.choices?.[0]?.message?.content?.trim() || ''
    // Nettoyer les guillemets éventuels
    musicPrompt = musicPrompt.replace(/^["']|["']$/g, '')
  } catch {
    // Fallback
    const moodMap: Record<string, string> = {
      joyeux: 'Upbeat cheerful ukulele and light percussion, sunny Caribbean feel',
      calme: 'Soft piano and gentle strings, peaceful ambient atmosphere',
      epique: 'Orchestral crescendo with brass and timpani, heroic cinematic feel',
      tropical: 'Steel drums and marimba, warm Caribbean rhythm, ocean breeze',
      mysterieux: 'Dark ambient synth pads, subtle bass pulses, ethereal atmosphere',
      electro: 'Modern electronic beat, punchy bass, energetic synth arpeggios',
    }
    musicPrompt = moodMap[musicMood || ''] || 'Upbeat instrumental background music, pleasant and engaging, mixed instruments'
  }

  // Soumettre à fal.ai ace-step
  try {
    const submitResponse = await fetch('https://queue.fal.run/fal-ai/ace-step/prompt-to-audio', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: musicPrompt,
        instrumental: true,
        duration: durationSec + 5, // Un peu plus long pour le montage
        number_of_steps: 27,
        scheduler: 'euler',
        guidance_type: 'apg',
        granularity_scale: 10,
        guidance_interval: 0.5,
        guidance_interval_decay: 0,
        guidance_scale: 15,
        minimum_guidance_scale: 3,
        tag_guidance_scale: 5,
        lyric_guidance_scale: 1.5,
      }),
    })

    if (!submitResponse.ok) {
      const errText = await submitResponse.text()
      throw new Error(`fal.ai ace-step: ${errText}`)
    }

    const submitData = await submitResponse.json()
    return {
      prompt: musicPrompt,
      status_url: submitData.status_url || null,
      response_url: submitData.response_url || null,
      audio_url: null,
      status: 'pending',
      error: null,
    }
  } catch (error) {
    console.error('Music submission error:', error)
    return {
      prompt: musicPrompt,
      status_url: null,
      response_url: null,
      audio_url: null,
      status: 'error',
      error: error instanceof Error ? error.message : 'Erreur soumission musique',
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// Soumission du montage à fal.ai (ffmpeg-api/compose)
// ═══════════════════════════════════════════════════════════════

async function submitMontageJob(
  videoJobs: VideoJob[],
  musicJob: MusicJob | null,
  durationSec: number,
): Promise<MontageJob> {
  const successfulVideos = videoJobs
    .filter(v => v.status === 'completed' && v.video_url)
    .sort((a, b) => a.index - b.index)

  // Track vidéo : tous les clips dans l'ordre
  const videoKeyframes = successfulVideos.map((v, i) => ({
    url: v.video_url!,
    timestamp: i * 5,
    duration: 5,
  }))

  const tracks: Array<{ id: string; type: string; keyframes: Array<{ url: string; timestamp: number; duration: number }> }> = [
    {
      id: '1',
      type: 'video',
      keyframes: videoKeyframes,
    },
  ]

  // Track audio si la musique a réussi
  if (musicJob && musicJob.status === 'completed' && musicJob.audio_url) {
    const totalVideoDuration = successfulVideos.length * 5
    tracks.push({
      id: '2',
      type: 'audio',
      keyframes: [{
        url: musicJob.audio_url,
        timestamp: 0,
        duration: totalVideoDuration,
      }],
    })
  }

  try {
    const submitResponse = await fetch('https://queue.fal.run/fal-ai/ffmpeg-api/compose', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tracks }),
    })

    if (!submitResponse.ok) {
      const errText = await submitResponse.text()
      throw new Error(`fal.ai ffmpeg (${submitResponse.status}): ${errText}`)
    }

    const submitData = await submitResponse.json()
    return {
      status_url: submitData.status_url || null,
      response_url: submitData.response_url || null,
      video_url: null,
      status: 'pending',
    }
  } catch (error) {
    console.error('Montage submission error:', error)
    return {
      status_url: null,
      response_url: null,
      video_url: null,
      status: 'error',
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// Gestion d'erreur + remboursement
// ═══════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleError(
  job: SparkVideoJob,
  adminSupabase: any,
  errorMessage: string,
  updatedImageJobs?: ImageJob[],
) {
  // Marquer en erreur
  await adminSupabase
    .from('spark_video_jobs')
    .update({
      status: 'error',
      error: errorMessage,
      ...(updatedImageJobs ? { image_jobs: updatedImageJobs } : {}),
    })
    .eq('id', job.id)

  // Rembourser les crédits
  const { data: creditData } = await adminSupabase
    .from('credits')
    .select('balance, lifetime_spent')
    .eq('profile_id', job.user_id)
    .single()

  if (creditData) {
    await adminSupabase
      .from('credits')
      .update({
        balance: creditData.balance + job.credits_used,
        lifetime_spent: Math.max(0, (creditData.lifetime_spent || 0) - job.credits_used),
      })
      .eq('profile_id', job.user_id)

    await adminSupabase
      .from('credit_transactions')
      .insert({
        profile_id: job.user_id,
        amount: job.credits_used,
        type: 'refund',
        description: `Spark Vidéo - Remboursement (${errorMessage})`,
      })
  }
}

// ═══════════════════════════════════════════════════════════════
// ROUTE GET — Polling + Orchestration
// ═══════════════════════════════════════════════════════════════

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json({ error: 'jobId requis' }, { status: 400 })
    }

    // Admin client pour lire et écrire
    const adminSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: job, error: fetchError } = await adminSupabase
      .from('spark_video_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !job) {
      return NextResponse.json({ error: 'Job non trouvé' }, { status: 404 })
    }

    // Orchestrer (avancer le pipeline si possible)
    const result = await orchestrate(job as SparkVideoJob, adminSupabase)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Spark Video status error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
