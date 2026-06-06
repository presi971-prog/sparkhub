import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/content-machine/supabase-admin'
import { generateKieImage } from '@/lib/content-machine/kie-ai'

interface GenerateImageRequest {
  prompt: string
  brandSlug: string
  aspectRatio?: string
}

/**
 * Telecharge une image depuis une URL et la stocke dans Supabase Storage.
 * Retourne le chemin de stockage et l'URL publique.
 */
async function downloadAndStore(
  imageUrl: string,
  brandSlug: string,
  index: number
): Promise<{ storagePath: string; publicUrl: string }> {
  const supabase = createAdminSupabase()

  // Telecharger l'image
  const imageResponse = await fetch(imageUrl)
  if (!imageResponse.ok) {
    throw new Error(`Impossible de telecharger l'image: ${imageResponse.status}`)
  }

  const imageBuffer = await imageResponse.arrayBuffer()
  const timestamp = Date.now()
  const storagePath = `${brandSlug}/${timestamp}-${index}.png`

  // Upload dans Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('content-machine')
    .upload(storagePath, imageBuffer, {
      contentType: 'image/png',
      upsert: false,
    })

  if (uploadError) {
    throw new Error(`Erreur upload Supabase Storage: ${uploadError.message}`)
  }

  // Generer l'URL publique
  const { data: publicUrlData } = supabase.storage
    .from('content-machine')
    .getPublicUrl(storagePath)

  return {
    storagePath,
    publicUrl: publicUrlData.publicUrl,
  }
}

export async function POST(req: Request) {
  try {
    const body: GenerateImageRequest = await req.json()
    const { prompt, brandSlug, aspectRatio } = body

    if (!prompt || !brandSlug) {
      return NextResponse.json(
        { error: 'prompt et brandSlug sont requis' },
        { status: 400 }
      )
    }

    // Generer l'image via Kie AI (generation pure, le logo sera ajoute en post-production)
    const imageUrls = await generateKieImage(prompt, aspectRatio || '1:1')

    // Telecharger et stocker la premiere image
    const { storagePath, publicUrl } = await downloadAndStore(
      imageUrls[0],
      brandSlug,
      0
    )

    return NextResponse.json({
      storagePath,
      publicUrl,
    })
  } catch (error) {
    console.error('[content-machine/generate-image] Erreur:', error)

    const message = error instanceof Error ? error.message : 'Erreur interne'

    // Gestion des erreurs specifiques Kie AI
    if (message.includes('KIE_NO_CREDITS')) {
      return NextResponse.json(
        { error: 'Plus de credits Kie AI. Rechargez votre compte.' },
        { status: 402 }
      )
    }
    if (message.includes('KIE_RATE_LIMIT')) {
      return NextResponse.json(
        { error: 'Trop de requetes. Reessayez dans quelques instants.' },
        { status: 429 }
      )
    }
    if (message.includes('KIE_TIMEOUT')) {
      return NextResponse.json(
        { error: 'La generation d\'image a pris trop de temps. Reessayez.' },
        { status: 504 }
      )
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
