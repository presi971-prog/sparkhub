import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/content-machine/supabase-admin'
import { askClaude } from '@/lib/content-machine/anthropic'
import { generateKieImage, generateKieVideo } from '@/lib/content-machine/kie-ai'
import { generateVoiceover, BRAND_VOICES } from '@/lib/content-machine/elevenlabs'

const CRON_SECRET = process.env.CRON_SECRET

/**
 * Verifie l'authentification du cron.
 * Accepte soit le header CRON_SECRET, soit le header Vercel Cron.
 */
function verifyCronAuth(req: Request): boolean {
  // Vercel Cron envoie un header Authorization
  const authHeader = req.headers.get('authorization')
  if (authHeader === `Bearer ${CRON_SECRET}`) return true

  // Header custom pour appels manuels
  const cronHeader = req.headers.get('x-cron-secret')
  if (cronHeader === CRON_SECRET) return true

  return false
}

interface CalendarEntry {
  id: string
  brand_id: string
  content_type: string
  theme: string
  date: string
  status: string
  cm_brands: {
    id: string
    slug: string
    name: string
    tone: string
    target_audience: string
    key_arguments: string[]
    rules: string
    colors: Record<string, string>
  }
}

/**
 * Genere le texte pour un contenu en appelant Claude directement
 * (pas de fetch interne pour eviter les problemes de cold start / timeout).
 */
interface Proposition {
  title: string
  description: string
}

interface GenerateTextResult {
  propositions: Proposition[]
  imagePrompt: string
}

async function generateTextForEntry(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  brand: any,
  contentType: string,
  theme: string
): Promise<GenerateTextResult> {
  const args = (brand.key_arguments || []).join(', ')
  const colors = brand.colors || {}

  const photoStyle = `photorealistic professional photograph, shot on Canon EOS R5, natural lighting, shallow depth of field, 8K quality. NEVER illustration, NEVER cartoon, NEVER drawing, NEVER digital art, NEVER anime, NEVER clipart. Real people, real places, real objects only.`

  // Mode "5 propositions" : pour chaque theme on genere 5 angles editoriaux
  // distincts. Thierry choisira lesquels publier. 1 image commune partagee
  // par les 5 propositions (cout maitrise).
  const formatInstruction = `Genere 5 propositions de post DIFFERENTES sur ce theme, chacune avec un angle editorial distinct (douleur / preuve / pedagogie / temoignage / promotion). Chaque proposition a un TITRE court (max 10 mots, accrocheur) et une DESCRIPTION complete (3 a 6 lignes, emojis moderes 1-2, hashtags FR a la fin dont 1 sur la Guadeloupe).

JSON STRICT (sans markdown, sans backticks) :
{
  "propositions": [
    { "title": "titre court 1", "description": "description complete 1 avec emojis et hashtags" },
    { "title": "titre court 2", "description": "..." },
    { "title": "titre court 3", "description": "..." },
    { "title": "titre court 4", "description": "..." },
    { "title": "titre court 5", "description": "..." }
  ],
  "imagePrompt": "${photoStyle} Caribbean/Guadeloupe tropical setting, brand colors ${colors.primary || ''} and ${colors.secondary || ''}, diverse Caribbean people with dark/mixed skin, square 1080x1080, warm golden hour lighting. No text, no logos, no watermarks. Describe the SPECIFIC scene relevant to the post theme."
}

CONTENT TYPE = ${contentType} (info pour adapter le ton, mais le format JSON ci-dessus reste identique).`

  const systemPrompt = `Tu es un expert en creation de contenu pour les reseaux sociaux, specialise dans le marche de la Guadeloupe et des Antilles francaises.

MARQUE : ${brand.name}
TON : ${brand.tone || 'Professionnel et engageant'}
CIBLE : ${brand.target_audience || 'Professionnels en Guadeloupe'}
ARGUMENTS CLES : ${args || 'Qualite, innovation, proximite'}
REGLES : ${brand.rules || 'Aucune regle speciale'}
COULEURS : ${colors.primary || '#000'} (principale), ${colors.secondary || '#FFF'} (secondaire)

REGLES ABSOLUES :
- Le TEXTE du post est TOUJOURS en francais
- Utilise des references locales Guadeloupe/Antilles/Caraibes naturellement
- Emojis moderes (2-3 max). Pas de liens ni URLs. 3-5 hashtags en francais dont au moins 1 sur la Guadeloupe.
- Les PROMPTS D'IMAGE sont en ANGLAIS (les modeles IA generent mieux en anglais)
- Les prompts d'image doivent decrire : contexte tropical caribeen, couleurs de la marque, personnes locales, format carre 1080x1080
- JAMAIS de texte, logo, ou watermark dans les prompts d'image
- Reponds UNIQUEMENT en JSON valide, sans markdown ni backticks.

${formatInstruction}`

  const rawResponse = await askClaude(
    systemPrompt,
    `Cree du contenu "${contentType}" sur le theme : "${theme}"`,
    3000
  )

  const cleaned = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned)
}

export async function POST(req: Request) {
  // Verification securite
  if (CRON_SECRET && !verifyCronAuth(req)) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  }

  const supabase = createAdminSupabase()
  const today = new Date().toISOString().split('T')[0]
  const results: Array<{ calendarId: string; brand: string; status: string; error?: string }> = []

  try {
    // Recuperer les entrees du calendrier pour aujourd'hui
    const { data: entries, error: fetchError } = await supabase
      .from('cm_calendar')
      .select('*, cm_brands(*)')
      .eq('date', today)
      .eq('status', 'planned')

    if (fetchError) {
      return NextResponse.json(
        { error: `Erreur lecture calendrier: ${fetchError.message}` },
        { status: 500 }
      )
    }

    if (!entries || entries.length === 0) {
      return NextResponse.json({
        message: 'Aucun contenu planifie pour aujourd\'hui',
        date: today,
        generated: 0,
      })
    }

    // Traiter chaque entree sequentiellement (queue pattern)
    for (const entry of entries as CalendarEntry[]) {
      try {
        // === VIDÉO : pipeline spécial ===
        if (entry.content_type === 'video') {
          console.log(`[generate-daily] Video pour ${entry.cm_brands.slug}...`)
          const brand = entry.cm_brands
          const colors = brand.colors || {}
          const args = (brand.key_arguments || []).join(', ')
          const voiceId = BRAND_VOICES[brand.slug] || BRAND_VOICES['dcg-ai']

          const photoStyle = `photorealistic professional photograph, Canon EOS R5, natural lighting, shallow depth of field. NEVER illustration, NEVER cartoon.`

          // 1. Script
          const scriptPrompt = `Tu es un realisateur publicitaire expert en contenu court TikTok/Reels.
MARQUE: ${brand.name} | TON: ${brand.tone} | CIBLE: ${brand.target_audience} | ARGUMENTS: ${args}
Cree un script video 15-20s (3-4 scenes) sur: "${entry.theme}"
Voix off en FRANCAIS, prompts image en ANGLAIS avec style ${photoStyle}, contexte Guadeloupe/Caraibes, couleurs ${colors.primary} ${colors.secondary}, format 1:1.
JSON sans markdown: { "title":"...", "voiceover_full":"texte complet voix off", "scenes":[{"sceneNumber":1,"voiceover":"...","imagePrompt":"English..."}], "post_text":"texte post FR avec emojis et hashtags" }`

          const rawScript = await askClaude(scriptPrompt, `Theme: ${entry.theme}`, 3000)
          const script = JSON.parse(rawScript.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())

          // 2. Voix off
          let voiceoverPath = ''
          try {
            const audioBuffer = await generateVoiceover(script.voiceover_full, voiceId)
            voiceoverPath = `${brand.slug}/videos/${today}-voiceover.mp3`
            await supabase.storage.from('content-machine').upload(voiceoverPath, audioBuffer, { contentType: 'audio/mpeg', upsert: false })
            console.log(`[generate-daily] Voix off OK: ${voiceoverPath}`)
          } catch (e) { console.error('[generate-daily] Voix off erreur:', e) }

          // 3. Images + clips
          const videoAssets: Array<{ type: string; storagePath: string; publicUrl: string; prompt: string; position: number }> = []

          for (let i = 0; i < (script.scenes || []).length; i++) {
            const scene = script.scenes[i]
            try {
              // Image
              const imgUrls = await generateKieImage(scene.imagePrompt, '1:1')
              const imgResp = await fetch(imgUrls[0])
              if (!imgResp.ok) continue
              const imgBuf = await imgResp.arrayBuffer()
              const imgPath = `${brand.slug}/videos/${today}-s${i + 1}.png`
              await supabase.storage.from('content-machine').upload(imgPath, imgBuf, { contentType: 'image/png', upsert: false })
              const { data: imgPub } = supabase.storage.from('content-machine').getPublicUrl(imgPath)
              videoAssets.push({ type: 'image', storagePath: imgPath, publicUrl: imgPub.publicUrl, prompt: scene.imagePrompt, position: i })

              // Clip vidéo (Veo 3)
              try {
                const vidUrls = await generateKieVideo(scene.imagePrompt, imgPub.publicUrl, 'veo3_fast')
                if (vidUrls.length > 0) {
                  const vidResp = await fetch(vidUrls[0])
                  if (vidResp.ok) {
                    const vidBuf = await vidResp.arrayBuffer()
                    const vidPath = `${brand.slug}/videos/${today}-s${i + 1}-clip.mp4`
                    await supabase.storage.from('content-machine').upload(vidPath, vidBuf, { contentType: 'video/mp4', upsert: false })
                    const { data: vidPub } = supabase.storage.from('content-machine').getPublicUrl(vidPath)
                    videoAssets.push({ type: 'video', storagePath: vidPath, publicUrl: vidPub.publicUrl, prompt: scene.imagePrompt, position: i })
                  }
                }
              } catch (ve) { console.error(`[generate-daily] Clip scene ${i + 1} erreur:`, ve) }
            } catch (ie) { console.error(`[generate-daily] Image scene ${i + 1} erreur:`, ie) }
          }

          // 4. Stocker contenu
          const { data: content, error: contentError } = await supabase
            .from('cm_contents')
            .insert({
              brand_id: entry.brand_id,
              calendar_id: entry.id,
              content_type: 'video',
              text_content: script.post_text || '',
              text_prompt: `Theme: ${entry.theme}`,
              image_prompts: script.scenes?.map((s: { imagePrompt: string }) => s.imagePrompt) || [],
              video_script: JSON.stringify(script),
              status: 'pending',
            })
            .select().single()

          if (contentError) throw new Error(`Erreur cm_contents: ${contentError.message}`)

          // Voix off asset
          if (voiceoverPath) {
            const { data: voPub } = supabase.storage.from('content-machine').getPublicUrl(voiceoverPath)
            await supabase.from('cm_assets').insert({ content_id: content.id, type: 'voiceover', storage_path: voiceoverPath, public_url: voPub.publicUrl, prompt: script.voiceover_full, position: 0 })
          }
          // Scene assets
          for (const a of videoAssets) {
            await supabase.from('cm_assets').insert({ content_id: content.id, type: a.type, storage_path: a.storagePath, public_url: a.publicUrl, prompt: a.prompt, position: a.position })
          }

          await supabase.from('cm_calendar').update({ status: 'generated' }).eq('id', entry.id)
          results.push({ calendarId: entry.id, brand: entry.cm_brands.slug, status: 'success' })
          continue
        }

        // === POST IMAGE / CAROUSEL : pipeline 5 propositions ===
        // 1. Generer 5 angles editoriaux + 1 prompt image commun
        const textResult = await generateTextForEntry(
          entry.cm_brands,
          entry.content_type,
          entry.theme
        )

        if (!Array.isArray(textResult.propositions) || textResult.propositions.length === 0) {
          throw new Error('Claude n\'a renvoye aucune proposition exploitable')
        }

        // 2. Generer 1 image commune (partagee par les 5 propositions)
        let storagePath: string | null = null
        let publicUrl: string | null = null
        try {
          const imageUrls = await generateKieImage(textResult.imagePrompt, '1:1')
          const imageResponse = await fetch(imageUrls[0])
          if (imageResponse.ok) {
            const imageBuffer = await imageResponse.arrayBuffer()
            const timestamp = Date.now()
            storagePath = `${entry.cm_brands.slug}/${today}/${timestamp}.png`
            const { error: uploadError } = await supabase.storage
              .from('content-machine')
              .upload(storagePath, imageBuffer, { contentType: 'image/png', upsert: false })
            if (uploadError) {
              storagePath = null
            } else {
              const { data: publicUrlData } = supabase.storage.from('content-machine').getPublicUrl(storagePath)
              publicUrl = publicUrlData.publicUrl
            }
          }
        } catch (imgError) {
          console.error(`[generate-daily] Erreur image pour ${entry.id}:`, imgError)
        }

        // 3. Pour chaque proposition : 1 cm_contents + 1 cm_assets (meme image)
        let createdCount = 0
        for (let i = 0; i < textResult.propositions.length; i++) {
          const prop = textResult.propositions[i]
          const text = `${prop.title}\n\n${prop.description}`

          const { data: content, error: contentError } = await supabase
            .from('cm_contents')
            .insert({
              brand_id: entry.brand_id,
              calendar_id: entry.id,
              content_type: entry.content_type,
              text_content: text,
              text_prompt: `Theme: ${entry.theme} | Angle ${i + 1}/${textResult.propositions.length}`,
              image_prompts: [textResult.imagePrompt],
              status: 'pending',
            })
            .select().single()

          if (contentError) {
            console.error(`[generate-daily] Erreur insert proposition ${i}:`, contentError)
            continue
          }

          if (storagePath && publicUrl) {
            await supabase.from('cm_assets').insert({
              content_id: content.id,
              type: 'image',
              storage_path: storagePath,
              public_url: publicUrl,
              prompt: textResult.imagePrompt,
              position: 0,
            })
          }
          createdCount++
        }

        if (createdCount === 0) {
          throw new Error('Aucune proposition n\'a pu etre persistee')
        }

        await supabase.from('cm_calendar').update({ status: 'generated' }).eq('id', entry.id)
        results.push({ calendarId: entry.id, brand: entry.cm_brands.slug, status: 'success' })
      } catch (entryError) {
        console.error(`[generate-daily] Erreur entree ${entry.id}:`, entryError)
        results.push({
          calendarId: entry.id,
          brand: entry.cm_brands.slug,
          status: 'error',
          error: entryError instanceof Error ? entryError.message : 'Erreur inconnue',
        })

        // Marquer en erreur dans le calendrier
        await supabase
          .from('cm_calendar')
          .update({ status: 'failed' })
          .eq('id', entry.id)
      }
    }

    const successCount = results.filter(r => r.status === 'success').length
    const errorCount = results.filter(r => r.status === 'error').length

    return NextResponse.json({
      message: `Generation terminee: ${successCount} succes, ${errorCount} erreurs`,
      date: today,
      generated: successCount,
      errors: errorCount,
      details: results,
    })
  } catch (error) {
    console.error('[content-machine/generate-daily] Erreur globale:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 }
    )
  }
}

// Vercel Cron envoie un GET — on accepte les deux methodes.
export async function GET(req: Request) {
  return POST(req)
}
