import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { writeFile, readFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

export const maxDuration = 60 // Vercel Pro: 60s max

export async function POST(req: Request) {
  try {
    const { video_url, audio_url, job_id, callback_token } = await req.json()

    if (!video_url || !audio_url || !job_id) {
      return NextResponse.json({ error: 'video_url, audio_url et job_id requis' }, { status: 400 })
    }

    // Vérifier le token (n8n envoie le callback_token)
    if (!callback_token) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 })
    }

    const tmp = tmpdir()
    const videoPath = join(tmp, `${job_id}_video.mp4`)
    const audioPath = join(tmp, `${job_id}_audio.mp3`)
    const outputPath = join(tmp, `${job_id}_merged.mp4`)

    // 1. Télécharger vidéo et audio en parallèle
    const [videoRes, audioRes] = await Promise.all([
      fetch(video_url),
      fetch(audio_url),
    ])

    if (!videoRes.ok || !audioRes.ok) {
      return NextResponse.json({ error: 'Erreur téléchargement fichiers' }, { status: 502 })
    }

    const [videoBuffer, audioBuffer] = await Promise.all([
      videoRes.arrayBuffer(),
      audioRes.arrayBuffer(),
    ])

    await Promise.all([
      writeFile(videoPath, Buffer.from(videoBuffer)),
      writeFile(audioPath, Buffer.from(audioBuffer)),
    ])

    // 2. Merge avec ffmpeg
    const ffmpegPath = (await import('ffmpeg-static')).default
    const { execSync } = await import('child_process')

    execSync(
      `${ffmpegPath} -y -i "${videoPath}" -i "${audioPath}" -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -shortest "${outputPath}"`,
      { timeout: 30000 }
    )

    // 3. Upload vers Supabase Storage
    const mergedBuffer = await readFile(outputPath)

    const adminSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const storagePath = `ugc-merged/${job_id}.mp4`
    const { error: uploadError } = await adminSupabase.storage
      .from('ugc-videos')
      .upload(storagePath, mergedBuffer, {
        contentType: 'video/mp4',
        upsert: true,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Erreur upload vidéo fusionnée' }, { status: 500 })
    }

    const { data: { publicUrl } } = adminSupabase.storage
      .from('ugc-videos')
      .getPublicUrl(storagePath)

    // 4. Nettoyage
    await Promise.all([
      unlink(videoPath).catch(() => {}),
      unlink(audioPath).catch(() => {}),
      unlink(outputPath).catch(() => {}),
    ])

    return NextResponse.json({ merged_url: publicUrl })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Merge error:', msg)
    return NextResponse.json({ error: `Merge failed: ${msg}` }, { status: 500 })
  }
}
