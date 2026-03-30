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
  subject_anchor: string | null
  scenes: Array<{ index: number; prompt: string; arc_role?: string }> | null
  image_jobs: ImageJob[] | null
  video_prompts: Array<{ index: number; prompt: string }> | null
  video_jobs: VideoJob[] | null
  music_job: MusicJob | null
  montage_job: MontageJob | null
  final_video_url: string | null
  error: string | null
}

// Durée de clip par tier (5s pour les courts, 10s pour les longs)
const TIER_CLIP_DURATION: Record<string, number> = {
  flash: 5, teaser: 5, short: 5, standard: 10, tiktok: 10, premium: 10,
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
    scenes: 5, images: 20, video_prompts: 5, videos: 40, music: 5, montage: 15, merge_audio: 10,
  }
  const stepLabels: Record<string, string> = {
    scenes: 'Écriture du scénario',
    images: 'Génération des images',
    video_prompts: 'Création des animations',
    videos: 'Génération des clips',
    music: 'Composition musicale',
    montage: 'Montage final',
    merge_audio: 'Ajout de la musique',
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
    const clipDuration = TIER_CLIP_DURATION[job.tier] || 5

    // Générer les prompts vidéo via Gemini (avec contexte narratif)
    const videoPrompts = await generateVideoPrompts(
      successfulImages,
      job.scenes || [],
      job.idea,
      job.ambiance,
      clipDuration,
    )

    // Soumettre les vidéos à fal.ai (durée adaptée au tier)
    const videoJobs = await submitVideoJobs(successfulImages, videoPrompts, clipDuration)

    // Sélectionner un morceau de musique depuis la bibliothèque (instantané)
    const musicJob = selectMusicTrack(job.music_mood, job.ambiance)

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
        const clipDur = TIER_CLIP_DURATION[job.tier] || 5
        const montageJob = await submitMontageJob(videoJobs, job.duration_seconds, clipDur)

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
        const videoUrl = (result?.video_url as string)
          || (result?.video as { url: string })?.url
          || (result?.output_url as string)

        if (videoUrl) {
          // Si on a de la musique, lancer la fusion audio
          const musicJob = job.music_job
          if (musicJob && musicJob.status === 'completed' && musicJob.audio_url) {
            const mergeJob = await submitAudioMergeJob(videoUrl, musicJob.audio_url)
            await adminSupabase
              .from('spark_video_jobs')
              .update({
                status: 'merge_audio',
                montage_job: { ...mj, status: 'completed', video_url: videoUrl },
                // Stocker le merge job dans music_job (on réutilise le champ)
                music_job: { ...musicJob, merge_status_url: mergeJob.status_url, merge_response_url: mergeJob.response_url, merge_status: 'pending' },
              })
              .eq('id', job.id)

            return {
              status: 'merge_audio',
              currentStep: { name: stepLabels.merge_audio, completed: 0, total: 1 },
              overallProgress: getProgress('merge_audio', 0),
            }
          }

          // Pas de musique → terminé directement
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

  // ── MERGE_AUDIO ──
  if (job.status === 'merge_audio' && job.music_job) {
    const mj = job.music_job as any
    const statusUrl = mj.merge_status_url
    const responseUrl = mj.merge_response_url

    if (mj.merge_status === 'pending' && statusUrl) {
      const falStatus = await checkFalStatus(statusUrl)

      if (falStatus.status === 'COMPLETED' && responseUrl) {
        const result = await getFalResult(responseUrl)
        const videoUrl = (result?.video_url as string)
          || (result?.video as { url: string })?.url
          || (result?.output_url as string)

        if (videoUrl) {
          await adminSupabase
            .from('spark_video_jobs')
            .update({
              status: 'completed',
              music_job: { ...mj, merge_status: 'completed' },
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
        // Si la fusion audio échoue, utiliser la vidéo sans musique
        const silentVideoUrl = job.montage_job?.video_url
        if (silentVideoUrl) {
          await adminSupabase
            .from('spark_video_jobs')
            .update({
              status: 'completed',
              music_job: { ...mj, merge_status: 'error' },
              final_video_url: silentVideoUrl,
            })
            .eq('id', job.id)

          return {
            status: 'completed',
            currentStep: { name: 'Terminé', completed: 1, total: 1 },
            overallProgress: 100,
            finalVideoUrl: silentVideoUrl,
          }
        }

        await handleError(job, adminSupabase, 'La fusion audio a échoué')
        return {
          status: 'error',
          currentStep: { name: stepLabels.merge_audio, completed: 0, total: 1 },
          overallProgress: 0,
          error: 'La fusion audio a échoué. Crédits remboursés.',
        }
      }
    }

    return {
      status: 'merge_audio',
      currentStep: { name: stepLabels.merge_audio, completed: 0, total: 1 },
      overallProgress: getProgress('merge_audio', 0.5),
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
  originalScenes: Array<{ index: number; prompt: string; arc_role?: string }>,
  idea: string,
  ambiance: string | null,
  clipDuration: number,
): Promise<Array<{ index: number; prompt: string }>> {
  // Construire le contexte des scènes pour Gemini
  const scenesContext = images.map((img, i) => {
    const scene = originalScenes.find(s => s.index === img.index) || originalScenes[i]
    const role = scene?.arc_role || 'rise'
    return `Scène ${img.index} [${role.toUpperCase()}] : "${scene?.prompt?.substring(0, 200) || 'scene visuelle'}"`
  }).join('\n')

  const systemPrompt = `Tu es un expert en ANIMATION VIDÉO cinématique. Pour chaque scène, tu crées un prompt de mouvement SPÉCIFIQUE et CAPTIVANT décrivant ce qui se passe pendant ${clipDuration} secondes.

IDÉE DE LA VIDÉO : "${idea}"
AMBIANCE : ${ambiance || 'adaptée à l\'idée'}
DURÉE PAR CLIP : ${clipDuration} secondes

═══ MOUVEMENTS SELON LE RÔLE NARRATIF ═══

HOOK : Mouvement SURPRENANT et CAPTIVANT. L'action démarre fort : révélation soudaine, geste spectaculaire, mouvement qui capte immédiatement l'attention. Énergie maximale dès la première seconde.

RISE : Mouvement PROGRESSIF et INTENSIFIANT. L'action monte en puissance : gestes de plus en plus assurés, environnement qui s'anime, détails qui se révèlent. Rythme qui accélère.

CLIMAX : Mouvement le plus DYNAMIQUE et IMPRESSIONNANT. L'apogée de l'action : geste le plus puissant, moment le plus intense, mouvement le plus spectaculaire de toute la vidéo.

RESOLUTION : Mouvement APAISANT et SATISFAISANT. L'action se conclut en beauté : ralentissement gracieux, sourire qui s'élargit, lumière dorée qui baigne la scène. Sentiment de plénitude.

═══ RÈGLES ═══

- UNE seule action fluide par scène
- Décris le MOUVEMENT CONCRET : ce qui bouge, comment, dans quelle direction
- Inclus des détails sensoriels en mouvement (fumée qui s'élève, lumière qui change, tissu qui ondule)
- SOUS 300 caractères par prompt
- Prompts en ANGLAIS
- Pas de termes de caméra ("camera pans", "zoom in", "close-up")

FORMAT JSON UNIQUEMENT :
{"prompts":[{"index":0,"prompt":"..."},{"index":1,"prompt":"..."}]}`

  const userContent = [{
    type: 'text' as const,
    text: `Voici les scènes avec leur rôle narratif :\n\n${scenesContext}\n\nCrée un prompt de mouvement SPÉCIFIQUE pour chaque scène selon son rôle narratif.`,
  }]

  try {
    const response = await fetch('https://api.kie.ai/gemini-3-pro/v1/chat/completions', {
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
    // Fallback amélioré selon le rôle narratif (plus de "Gentle natural movement")
    return images.map((img, i) => {
      const scene = originalScenes.find(s => s.index === img.index) || originalScenes[i]
      const role = scene?.arc_role || 'rise'
      const fallbacks: Record<string, string> = {
        hook: `Dynamic revealing movement, subject comes into sharp focus with a striking gesture, environmental elements react with energy, dramatic light shift over ${clipDuration} seconds.`,
        rise: `Progressive confident action, building intensity with purposeful movement, surrounding details animate with growing momentum over ${clipDuration} seconds.`,
        climax: `Peak action moment, the most powerful and impressive movement, maximum energy and visual impact, elements converging in spectacular fashion over ${clipDuration} seconds.`,
        resolution: `Slow satisfying movement, warm golden light gradually intensifying, gentle settling motion, peaceful and fulfilling atmosphere over ${clipDuration} seconds.`,
      }
      return {
        index: img.index,
        prompt: fallbacks[role] || fallbacks.rise,
      }
    })
  }
}

// ═══════════════════════════════════════════════════════════════
// Soumission des vidéos à fal.ai (kling-video)
// ═══════════════════════════════════════════════════════════════

async function submitVideoJobs(
  images: ImageJob[],
  videoPrompts: Array<{ index: number; prompt: string }>,
  clipDuration: number,
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
            duration: String(clipDuration),
            aspect_ratio: '9:16',
            negative_prompt: 'bad quality, blurry, distorted, morphing face, extra limbs, deformed hands, jittery movement, sudden jumps, flickering',
            cfg_scale: 0.7,
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
// Sélection de musique depuis la bibliothèque (Supabase Storage)
// ═══════════════════════════════════════════════════════════════

const MUSIC_STORAGE_BASE = 'https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/music'

// 3 morceaux par ambiance, tous royalty-free (Mixkit License)
const MUSIC_LIBRARY: Record<string, string[]> = {
  joyeux:     ['joyeux/track1.mp3', 'joyeux/track2.mp3', 'joyeux/track3.mp3'],
  calme:      ['calme/track1.mp3', 'calme/track2.mp3', 'calme/track3.mp3'],
  epique:     ['epique/track1.mp3', 'epique/track2.mp3', 'epique/track3.mp3'],
  tropical:   ['tropical/track1.mp3', 'tropical/track2.mp3', 'tropical/track3.mp3'],
  mysterieux: ['mysterieux/track1.mp3', 'mysterieux/track2.mp3', 'mysterieux/track3.mp3'],
  electro:    ['electro/track1.mp3', 'electro/track2.mp3', 'electro/track3.mp3'],
}

// Mapping ambiance vidéo → mood musical par défaut
const AMBIANCE_TO_MOOD: Record<string, string> = {
  cinematique: 'epique',
  drole: 'joyeux',
  inspirant: 'epique',
  dramatique: 'epique',
  tropical: 'tropical',
  mysterieux: 'mysterieux',
  energique: 'electro',
}

function selectMusicTrack(
  musicMood: string | null,
  ambiance: string | null,
): MusicJob {
  // Déterminer le mood : priorité au choix utilisateur, sinon déduire de l'ambiance
  let mood = musicMood || ''
  if (!MUSIC_LIBRARY[mood]) {
    mood = (ambiance && AMBIANCE_TO_MOOD[ambiance]) || 'joyeux'
  }

  const tracks = MUSIC_LIBRARY[mood] || MUSIC_LIBRARY.joyeux
  const randomTrack = tracks[Math.floor(Math.random() * tracks.length)]
  const audioUrl = `${MUSIC_STORAGE_BASE}/${randomTrack}`

  return {
    prompt: `Library: ${mood}/${randomTrack}`,
    status_url: null,
    response_url: null,
    audio_url: audioUrl,
    status: 'completed',
    error: null,
  }
}

// ═══════════════════════════════════════════════════════════════
// Soumission du montage à fal.ai (ffmpeg-api/compose)
// ═══════════════════════════════════════════════════════════════

async function submitMontageJob(
  videoJobs: VideoJob[],
  durationSec: number,
  clipDuration: number,
): Promise<MontageJob> {
  const successfulVideos = videoJobs
    .filter(v => v.status === 'completed' && v.video_url)
    .sort((a, b) => a.index - b.index)

  // Track vidéo UNIQUEMENT (audio ajouté en étape séparée via merge-audio-video)
  const clipDurationMs = clipDuration * 1000
  const videoKeyframes = successfulVideos.map((v, i) => ({
    url: v.video_url!,
    timestamp: i * clipDurationMs,
    duration: clipDurationMs,
  }))

  const tracks = [
    {
      id: '1',
      type: 'video',
      keyframes: videoKeyframes,
    },
  ]

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
// Fusion audio + vidéo (merge-audio-video — la sortie s'arrête à la durée vidéo)
// ═══════════════════════════════════════════════════════════════

async function submitAudioMergeJob(
  videoUrl: string,
  audioUrl: string,
): Promise<MontageJob> {
  try {
    const submitResponse = await fetch('https://queue.fal.run/fal-ai/ffmpeg-api/merge-audio-video', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_url: videoUrl,
        audio_url: audioUrl,
      }),
    })

    if (!submitResponse.ok) {
      const errText = await submitResponse.text()
      throw new Error(`fal.ai merge-audio-video (${submitResponse.status}): ${errText}`)
    }

    const submitData = await submitResponse.json()
    return {
      status_url: submitData.status_url || null,
      response_url: submitData.response_url || null,
      video_url: null,
      status: 'pending',
    }
  } catch (error) {
    console.error('Audio merge submission error:', error)
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
