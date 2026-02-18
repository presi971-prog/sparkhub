import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const { video_url, audio_url, job_id, callback_token } = await req.json()

    if (!video_url || !audio_url || !job_id) {
      return NextResponse.json({ error: 'video_url, audio_url et job_id requis' }, { status: 400 })
    }

    if (!callback_token) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 })
    }

    // 1. Charger ffmpeg WASM
    const ffmpeg = new FFmpeg()
    await ffmpeg.load()

    // 2. Charger les fichiers dans le système de fichiers virtuel ffmpeg
    const videoData = await fetchFile(video_url)
    const audioData = await fetchFile(audio_url)

    await ffmpeg.writeFile('input.mp4', videoData)
    await ffmpeg.writeFile('input.mp3', audioData)

    // 3. Merger vidéo + audio
    await ffmpeg.exec([
      '-i', 'input.mp4',
      '-i', 'input.mp3',
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-map', '0:v:0',
      '-map', '1:a:0',
      '-shortest',
      'output.mp4',
    ])

    // 4. Lire le résultat
    const outputData = await ffmpeg.readFile('output.mp4')
    const outputBuffer = Buffer.from(outputData as Uint8Array)

    // 5. Upload vers Supabase Storage
    const adminSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const storagePath = `ugc-merged/${job_id}.mp4`
    const { error: uploadError } = await adminSupabase.storage
      .from('ugc-videos')
      .upload(storagePath, outputBuffer, {
        contentType: 'video/mp4',
        upsert: true,
      })

    if (uploadError) {
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
    }

    const { data: { publicUrl } } = adminSupabase.storage
      .from('ugc-videos')
      .getPublicUrl(storagePath)

    // 6. Terminer ffmpeg
    ffmpeg.terminate()

    return NextResponse.json({ merged_url: publicUrl })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: `Merge failed: ${msg}` }, { status: 500 })
  }
}
