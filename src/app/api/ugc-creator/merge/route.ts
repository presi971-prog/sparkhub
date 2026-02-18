import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { writeFile, readFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { execSync } from 'child_process'

export const maxDuration = 60

export async function POST(req: Request) {
  const steps: string[] = []

  try {
    const { video_url, audio_url, job_id, callback_token } = await req.json()

    if (!video_url || !audio_url || !job_id) {
      return NextResponse.json({ error: 'video_url, audio_url et job_id requis' }, { status: 400 })
    }

    if (!callback_token) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 })
    }

    const tmp = tmpdir()
    const videoPath = join(tmp, `${job_id}_video.mp4`)
    const audioPath = join(tmp, `${job_id}_audio.mp3`)
    const outputPath = join(tmp, `${job_id}_merged.mp4`)

    // 1. Trouver le binaire ffmpeg
    steps.push('finding ffmpeg')
    let ffmpegPath: string

    try {
      // Option A: @ffmpeg-installer/ffmpeg
      const installer = await import('@ffmpeg-installer/ffmpeg')
      ffmpegPath = installer.path
      steps.push(`installer path: ${ffmpegPath}`)
    } catch {
      try {
        // Option B: ffmpeg-static
        const staticPkg = await import('ffmpeg-static')
        ffmpegPath = staticPkg.default as string
        steps.push(`static path: ${ffmpegPath}`)
      } catch {
        // Option C: system ffmpeg
        ffmpegPath = 'ffmpeg'
        steps.push('fallback to system ffmpeg')
      }
    }

    // Vérifier que ffmpeg existe
    try {
      execSync(`${ffmpegPath} -version`, { timeout: 5000, stdio: 'pipe' })
      steps.push('ffmpeg found')
    } catch {
      return NextResponse.json({
        error: `ffmpeg not found at: ${ffmpegPath}`,
        steps,
      }, { status: 500 })
    }

    // 2. Télécharger vidéo et audio
    steps.push('downloading files')
    const [videoRes, audioRes] = await Promise.all([
      fetch(video_url),
      fetch(audio_url),
    ])

    if (!videoRes.ok || !audioRes.ok) {
      return NextResponse.json({
        error: `Download failed: video=${videoRes.status}, audio=${audioRes.status}`,
        steps,
      }, { status: 502 })
    }

    const [videoBuffer, audioBuffer] = await Promise.all([
      videoRes.arrayBuffer(),
      audioRes.arrayBuffer(),
    ])

    steps.push(`downloaded: video=${videoBuffer.byteLength}B, audio=${audioBuffer.byteLength}B`)

    await Promise.all([
      writeFile(videoPath, Buffer.from(videoBuffer)),
      writeFile(audioPath, Buffer.from(audioBuffer)),
    ])

    // 3. Merge
    steps.push('merging')
    const cmd = `${ffmpegPath} -y -i "${videoPath}" -i "${audioPath}" -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -shortest "${outputPath}"`
    execSync(cmd, { timeout: 30000, stdio: 'pipe' })
    steps.push('merge done')

    // 4. Upload
    steps.push('uploading')
    const mergedBuffer = await readFile(outputPath)
    steps.push(`merged size: ${mergedBuffer.byteLength}B`)

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
      return NextResponse.json({
        error: `Upload failed: ${uploadError.message}`,
        steps,
      }, { status: 500 })
    }

    const { data: { publicUrl } } = adminSupabase.storage
      .from('ugc-videos')
      .getPublicUrl(storagePath)

    steps.push('done')

    // Nettoyage
    await Promise.all([
      unlink(videoPath).catch(() => {}),
      unlink(audioPath).catch(() => {}),
      unlink(outputPath).catch(() => {}),
    ])

    return NextResponse.json({ merged_url: publicUrl })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: `Merge failed: ${msg}`, steps }, { status: 500 })
  }
}
