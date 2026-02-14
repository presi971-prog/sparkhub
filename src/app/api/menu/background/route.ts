import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const FAL_KEY = process.env.FAL_KEY!

// Mapping aspect ratio vers taille de generation fal.ai
function getImageSize(aspectRatio: string): string | { width: number; height: number } {
  switch (aspectRatio) {
    case 'square':
      return 'square_hd' // 1024x1024
    case 'portrait':
      return 'portrait_4_3' // 768x1024
    case 'landscape':
      return 'landscape_16_9' // 1024x576
    default:
      return 'portrait_4_3'
  }
}

function getAspectRatio(width: number, height: number | 'auto'): string {
  if (height === 'auto') return 'portrait'
  const ratio = width / (height as number)
  if (ratio > 1.3) return 'landscape'
  if (ratio < 0.8) return 'portrait'
  return 'square'
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
    }

    const { templatePrompt, themeAddition, width, height } = await req.json()

    if (!templatePrompt) {
      return NextResponse.json({ error: 'templatePrompt requis' }, { status: 400 })
    }

    // Construire le prompt complet
    let prompt = templatePrompt
    if (themeAddition) {
      prompt = `${templatePrompt}, ${themeAddition}`
    }

    // Determiner le ratio d'aspect
    const aspectRatio = getAspectRatio(width || 794, height || 'auto')
    const imageSize = getImageSize(aspectRatio)

    // Appel synchrone a fal.ai flux/schnell
    const response = await fetch('https://fal.run/fal-ai/flux/schnell', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        image_size: imageSize,
        num_images: 1,
        num_inference_steps: 4,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('fal.ai background error:', response.status, errText.slice(0, 300))
      return NextResponse.json({
        error: 'Erreur generation du fond',
        _debug: `fal.ai ${response.status}: ${errText.slice(0, 200)}`,
      }, { status: 500 })
    }

    const data = await response.json()
    const backgroundUrl = data.images?.[0]?.url

    if (!backgroundUrl) {
      return NextResponse.json({
        error: 'Pas d\'image generee',
        _debug: JSON.stringify(data).slice(0, 300),
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      backgroundUrl,
    })
  } catch (error) {
    console.error('Background generation error:', error)
    return NextResponse.json({
      error: 'Erreur interne',
      _debug: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}
