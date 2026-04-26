import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/content-machine/supabase-admin'
import { generateKieImage, generateKieVideo } from '@/lib/content-machine/kie-ai'
import { generateVoiceover, BRAND_VOICES } from '@/lib/content-machine/elevenlabs'
import { askClaude } from '@/lib/content-machine/anthropic'

interface GenerateVideoRequest {
  brandSlug: string
  theme: string
  contentId?: string // Si on regénère une vidéo existante
}

/**
 * Génère une vidéo complète pour une marque :
 * 1. Script (scènes + voix off)
 * 2. Voix off audio (ElevenLabs)
 * 3. Images des scènes (Kie AI Nano Banana Pro)
 * 4. Clips vidéo à partir des images (Kie AI Veo 3)
 * 5. Stocke tous les assets dans Supabase
 */
export async function POST(req: Request) {
  const supabase = createAdminSupabase()

  try {
    const body: GenerateVideoRequest = await req.json()
    const { brandSlug, theme, contentId } = body

    if (!brandSlug || !theme) {
      return NextResponse.json(
        { error: 'brandSlug et theme sont requis' },
        { status: 400 }
      )
    }

    // Charger la marque
    const { data: brand, error: brandError } = await supabase
      .from('cm_brands')
      .select('*')
      .eq('slug', brandSlug)
      .single()

    if (brandError || !brand) {
      return NextResponse.json(
        { error: `Marque "${brandSlug}" non trouvee` },
        { status: 404 }
      )
    }

    const colors = brand.colors || {}
    const args = (brand.key_arguments || []).join(', ')
    const voiceId = BRAND_VOICES[brandSlug] || BRAND_VOICES['dcg-ai']

    console.log(`[video] Debut generation video pour ${brandSlug}: "${theme}"`)

    // ========== ÉTAPE 1 : Script ==========
    console.log('[video] Etape 1/4 : Script...')

    const photoStyle = `photorealistic professional photograph, shot on Canon EOS R5, natural lighting, shallow depth of field, 8K. NEVER illustration, NEVER cartoon. Real people, real places.`

    const scriptPrompt = `Tu es un realisateur publicitaire expert en contenu court pour TikTok/Reels.

MARQUE : ${brand.name}
TON : ${brand.tone}
CIBLE : ${brand.target_audience}
ARGUMENTS : ${args}
COULEURS : ${colors.primary} et ${colors.secondary}

Cree un script video de 15-20 secondes (4 scenes) sur le theme : "${theme}"

=== REGLE CHARACTER CONSISTENCY (OBLIGATOIRE) ===
Toutes les scenes partagent le MEME univers visuel :
- MEME decor/lieu (ex: un restaurant, un bureau, une rue)
- MEME style photographique (eclairage, palette, ambiance)
- MEME personnage ou sujet central si applicable
- MEME moment de la journee (matin dore, nuit, coucher de soleil...)

Ce qui CHANGE entre les scenes = UNIQUEMENT le mouvement de camera :
- Scene 1 : plan rapproche / zoom in sur le sujet
- Scene 2 : plan moyen / travelling lateral
- Scene 3 : plan large / recul progressif ou panoramique
- Scene 4 : plan drone / vue aerienne en elevation ou plan final signature

Chaque imagePrompt DOIT contenir un bloc "CONSISTENCY:" qui repete les elements fixes (decor, eclairage, style, sujet) + un bloc "CAMERA:" qui decrit le mouvement unique de cette scene.

REGLES GENERALES :
- Voix off en FRANCAIS, ton ${brand.tone}
- Prompts image en ANGLAIS avec style: ${photoStyle}
- Chaque scene dure 4-5 secondes
- Contexte caribeen/Guadeloupe
- Format carre 1:1

Reponds UNIQUEMENT en JSON valide sans markdown :
{
  "title": "titre court de la video",
  "consistency_core": "English description of the fixed visual universe shared by ALL scenes (location, lighting, style, subject, time of day, mood)",
  "voiceover_full": "le texte complet de la voix off, toutes scenes combinees en un seul paragraphe fluide",
  "scenes": [
    {
      "sceneNumber": 1,
      "duration": "5s",
      "cameraMove": "zoom in / tracking / pan / drone rise",
      "voiceover": "texte voix off de cette scene",
      "imagePrompt": "CONSISTENCY: [fixed elements repeated]. CAMERA: [unique camera move for this scene]. ${photoStyle} Caribbean Guadeloupe, brand colors ${colors.primary} ${colors.secondary}, square 1:1"
    }
  ],
  "post_text": "texte du post Instagram/TikTok qui accompagne la video, en francais, 2-3 emojis, 3-5 hashtags"
}`

    const rawScript = await askClaude(scriptPrompt, `Theme: ${theme}`, 3000)
    const script = JSON.parse(
      rawScript.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    )

    console.log(`[video] Script: ${script.scenes?.length || 0} scenes, voix off: ${script.voiceover_full?.length || 0} chars`)
    console.log(`[video] Consistency core: ${script.consistency_core || 'non defini'}`)

    // ========== ÉTAPE 2 : Voix off ==========
    console.log('[video] Etape 2/4 : Voix off ElevenLabs...')

    let voiceoverPath = ''
    try {
      const audioBuffer = await generateVoiceover(script.voiceover_full, voiceId)
      const timestamp = Date.now()
      voiceoverPath = `${brandSlug}/videos/${timestamp}-voiceover.mp3`

      await supabase.storage
        .from('content-machine')
        .upload(voiceoverPath, audioBuffer, {
          contentType: 'audio/mpeg',
          upsert: false,
        })

      console.log('[video] Voix off generee et stockee:', voiceoverPath)
    } catch (err) {
      console.error('[video] Erreur voix off:', err)
      // On continue sans voix off
    }

    // ========== ÉTAPE 3 : Images des scènes ==========
    console.log('[video] Etape 3/4 : Images des scenes...')

    const sceneAssets: Array<{
      type: string
      storagePath: string
      prompt: string
      position: number
      videoUrl?: string
    }> = []

    for (let i = 0; i < (script.scenes || []).length; i++) {
      const scene = script.scenes[i]
      console.log(`[video] Scene ${i + 1}/${script.scenes.length}: image...`)

      try {
        const imageUrls = await generateKieImage(scene.imagePrompt, '1:1')

        // Télécharger et stocker l'image
        const imgResponse = await fetch(imageUrls[0])
        if (imgResponse.ok) {
          const imgBuffer = await imgResponse.arrayBuffer()
          const timestamp = Date.now()
          const imgPath = `${brandSlug}/videos/${timestamp}-scene${i + 1}.png`

          await supabase.storage
            .from('content-machine')
            .upload(imgPath, imgBuffer, {
              contentType: 'image/png',
              upsert: false,
            })

          sceneAssets.push({
            type: 'image',
            storagePath: imgPath,
            prompt: scene.imagePrompt,
            position: i,
          })

          console.log(`[video] Scene ${i + 1} image OK:`, imgPath)

          // ========== ÉTAPE 4 : Clip vidéo à partir de l'image ==========
          console.log(`[video] Scene ${i + 1}: clip video Veo 3...`)

          try {
            const publicImgUrl = `https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/content-machine/${imgPath}`
            // Enrichir le prompt vidéo avec la directive de mouvement caméra
            const videoPrompt = scene.cameraMove
              ? `${scene.imagePrompt}. Camera movement: ${scene.cameraMove}, smooth cinematic motion, 5 seconds.`
              : scene.imagePrompt
            const videoUrls = await generateKieVideo(
              videoPrompt,
              publicImgUrl,
              'veo3_fast'
            )

            if (videoUrls.length > 0) {
              // Télécharger et stocker le clip
              const vidResponse = await fetch(videoUrls[0])
              if (vidResponse.ok) {
                const vidBuffer = await vidResponse.arrayBuffer()
                const vidPath = `${brandSlug}/videos/${timestamp}-scene${i + 1}-clip.mp4`

                await supabase.storage
                  .from('content-machine')
                  .upload(vidPath, vidBuffer, {
                    contentType: 'video/mp4',
                    upsert: false,
                  })

                sceneAssets.push({
                  type: 'video',
                  storagePath: vidPath,
                  prompt: scene.imagePrompt,
                  position: i,
                })

                console.log(`[video] Scene ${i + 1} clip OK:`, vidPath)
              }
            }
          } catch (vidErr) {
            console.error(`[video] Erreur clip scene ${i + 1}:`, vidErr)
            // On continue — l'image suffit, Thierry peut animer dans CapCut
          }
        }
      } catch (imgErr) {
        console.error(`[video] Erreur image scene ${i + 1}:`, imgErr)
      }
    }

    // ========== STOCKAGE EN BASE ==========
    console.log('[video] Stockage en base...')

    // Créer ou mettre à jour le contenu
    const contentData = {
      brand_id: brand.id,
      content_type: 'video',
      text_content: script.post_text || '',
      text_prompt: `Theme: ${theme}`,
      video_script: JSON.stringify(script),
      image_prompts: script.scenes?.map((s: { imagePrompt: string }) => s.imagePrompt) || [],
      status: 'pending',
    }

    let finalContentId = contentId

    if (contentId) {
      // Mise à jour
      await supabase
        .from('cm_contents')
        .update(contentData)
        .eq('id', contentId)
      finalContentId = contentId
    } else {
      // Création
      const { data: newContent } = await supabase
        .from('cm_contents')
        .insert(contentData)
        .select('id')
        .single()
      finalContentId = newContent?.id
    }

    if (!finalContentId) {
      throw new Error('Erreur creation contenu video')
    }

    // Stocker les assets
    // Voix off
    if (voiceoverPath) {
      const { data: publicUrlData } = supabase.storage
        .from('content-machine')
        .getPublicUrl(voiceoverPath)

      await supabase.from('cm_assets').insert({
        content_id: finalContentId,
        type: 'voiceover',
        storage_path: voiceoverPath,
        public_url: publicUrlData.publicUrl,
        prompt: script.voiceover_full,
        position: 0,
      })
    }

    // Images et clips des scènes
    for (const asset of sceneAssets) {
      const { data: publicUrlData } = supabase.storage
        .from('content-machine')
        .getPublicUrl(asset.storagePath)

      await supabase.from('cm_assets').insert({
        content_id: finalContentId,
        type: asset.type,
        storage_path: asset.storagePath,
        public_url: publicUrlData.publicUrl,
        prompt: asset.prompt,
        position: asset.position,
      })
    }

    console.log(`[video] Generation terminee: ${sceneAssets.length} assets + voix off`)

    return NextResponse.json({
      contentId: finalContentId,
      title: script.title,
      scenes: script.scenes?.length || 0,
      voiceover: !!voiceoverPath,
      clips: sceneAssets.filter(a => a.type === 'video').length,
      images: sceneAssets.filter(a => a.type === 'image').length,
      postText: script.post_text,
    })
  } catch (error) {
    console.error('[content-machine/generate-video] Erreur:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 }
    )
  }
}
