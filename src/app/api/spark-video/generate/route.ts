import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const KIE_API_KEY = process.env.KIE_API_KEY!
const FAL_KEY = process.env.FAL_KEY!

// Tiers de durée (dupliqué ici pour l'API — pas d'import client)
const TIERS: Record<string, { scenes: number; durationSec: number; credits: number }> = {
  flash:    { scenes: 2,  durationSec: 10, credits: 25 },
  teaser:   { scenes: 3,  durationSec: 15, credits: 30 },
  short:    { scenes: 5,  durationSec: 25, credits: 40 },
  standard: { scenes: 8,  durationSec: 40, credits: 55 },
  tiktok:   { scenes: 10, durationSec: 50, credits: 65 },
  premium:  { scenes: 13, durationSec: 65, credits: 80 },
}

// ═══════════════════════════════════════════════════════════════
// AMBIANCE → directives visuelles pour Gemini
// ═══════════════════════════════════════════════════════════════

const AMBIANCE_DIRECTIVES: Record<string, string> = {
  cinematique: 'Cinematic realism. Golden hour lighting, lens flare, shallow depth of field, film grain. Think Terrence Malick or Wes Anderson. Wide establishing shots, dramatic close-ups.',
  drole: 'Comedic timing through visuals. Exaggerated expressions, unexpected situations, slapstick moments. Bright saturated colors, silly props. Think Pixar shorts — the humor is in the visuals.',
  inspirant: 'Uplifting and aspirational. Warm golden light, expansive landscapes, triumphant poses. Slow motion feel, sun rays, lens flare. Think Nike "Just Do It" ads.',
  dramatique: 'High contrast, moody lighting. Dark shadows, single light sources, silhouettes. Rain, fire, storm clouds. Intense close-ups. Think David Fincher or Christopher Nolan.',
  tropical: 'Caribbean paradise colors. Turquoise water, palm trees, hibiscus flowers, sunset oranges. Warm, vivid, sun-drenched. The beauty of the Antilles — authentic, not cliché.',
  mysterieux: 'Ethereal and enigmatic. Fog, mist, moonlight, bioluminescence. Cool blue-purple tones. Soft focus, dreamlike quality. Think Arrival or Blade Runner 2049.',
  energique: 'Dynamic and explosive. Speed lines, bright neons, action shots. Particles, sparks, motion blur. High saturation, punchy contrast. Think music video energy.',
}

// ═══════════════════════════════════════════════════════════════
// Génération des scènes via Gemini
// ═══════════════════════════════════════════════════════════════

async function generateScenes(
  idea: string,
  scenesCount: number,
  ambiance: string | null,
): Promise<Array<{ index: number; prompt: string }>> {

  const ambianceDirective = ambiance && AMBIANCE_DIRECTIVES[ambiance]
    ? `\n\nAMBIANCE OBLIGATOIRE :\n${AMBIANCE_DIRECTIVES[ambiance]}`
    : '\nChoisis l\'ambiance la plus adaptée à l\'idée. Sois CRÉATIF.'

  const systemPrompt = `Tu es un SCÉNARISTE IA expert en vidéos courtes virales (TikTok, Instagram Reels). Tu décomposes n'importe quelle idée en scènes visuelles cinématiques.

TON TRAVAIL : transformer l'idée de l'utilisateur en ${scenesCount} scènes qui racontent une HISTOIRE VISUELLE cohérente et captivante.
${ambianceDirective}

═══ RÈGLES ABSOLUES ═══

1. Génère EXACTEMENT ${scenesCount} scènes
2. Chaque scène = UN seul moment figé, UNE action précise
3. Chaque prompt en ANGLAIS (pour le moteur d'image fal.ai)
4. Chaque prompt SOUS 500 caractères
5. Format portrait 9:16 (vertical, comme un téléphone)
6. Style PHOTO-RÉALISTE (pas cartoon, pas illustration)
7. Pas de texte dans l'image, pas de sous-titres
8. Pas de termes de caméra ("camera pans", "zoom in")

═══ STRUCTURE NARRATIVE ═══

- SCÈNE 1 : HOOK — l'image la plus SURPRENANTE, DRÔLE ou SPECTACULAIRE. C'est elle qui arrête le scroll. Elle doit donner envie de voir la suite.
- SCÈNES 2 à ${scenesCount - 1} : DÉVELOPPEMENT — chaque scène est l'étape SUIVANTE de l'action. Progression logique, pas de répétition.
- SCÈNE ${scenesCount} : CONCLUSION — le moment final satisfaisant, drôle ou émouvant.

═══ QUALITÉ DES PROMPTS ═══

Chaque prompt DOIT inclure :
- Le SUJET principal (qui/quoi) — décrit de manière identique à chaque scène pour la cohérence
- L'ACTION précise (que se passe-t-il dans cette scène)
- L'ENVIRONNEMENT (où, quelle lumière, quels détails de texture)
- Les DÉTAILS SENSORIELS (poussière, vapeur, reflets, gouttes d'eau, textures)

Exemple de BON prompt :
"A fluffy white cat wearing a tiny chef hat carefully slicing potatoes on a wooden cutting board in a sun-drenched rustic kitchen, flour dust floating in golden light beams, herbs scattered on the marble counter, warm amber tones, photorealistic, portrait 9:16"

Exemple de MAUVAIS prompt :
"A cat cooking in a kitchen" (trop vague, aucun détail)

═══ FORMAT DE RÉPONSE ═══

UNIQUEMENT du JSON, sans markdown, sans backticks, sans texte avant ou après :
{"scenes":[{"index":0,"prompt":"..."},{"index":1,"prompt":"..."}]}`

  const response = await fetch('https://api.kie.ai/gemini-2.5-flash/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KIE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: [{ type: 'text', text: systemPrompt }] },
        {
          role: 'user',
          content: [{
            type: 'text',
            text: `IDÉE DE VIDÉO : "${idea}"\n\nDécompose cette idée en ${scenesCount} scènes visuelles. Sois PRÉCIS, CRÉATIF et SPÉCIFIQUE. Chaque scène doit être unique et faire avancer l'histoire.`,
          }],
        },
      ],
      stream: false,
      include_thoughts: false,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    console.error('Gemini scenes error:', response.status, errText)
    throw new Error(`Erreur Gemini: ${response.status}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ''
  const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  const parsed = JSON.parse(cleanContent)

  if (!parsed.scenes || !Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
    throw new Error('Gemini n\'a pas retourné de scènes valides')
  }

  return parsed.scenes.map((s: { index?: number; prompt: string }, i: number) => ({
    index: s.index ?? i,
    prompt: s.prompt,
  }))
}

// ═══════════════════════════════════════════════════════════════
// Soumission des images à fal.ai (parallèle)
// ═══════════════════════════════════════════════════════════════

async function submitImageJobs(
  scenes: Array<{ index: number; prompt: string }>,
): Promise<Array<{
  index: number
  status_url: string | null
  response_url: string | null
  image_url: string | null
  status: string
  error: string | null
}>> {
  const results = await Promise.allSettled(
    scenes.map(async (scene) => {
      const submitResponse = await fetch('https://queue.fal.run/fal-ai/flux-pro', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${FAL_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: scene.prompt,
          image_size: 'portrait_16_9',
          num_images: 1,
        }),
      })

      if (!submitResponse.ok) {
        const errText = await submitResponse.text()
        throw new Error(`fal.ai (${submitResponse.status}): ${errText}`)
      }

      const submitData = await submitResponse.json()
      return {
        index: scene.index,
        status_url: submitData.status_url || null,
        response_url: submitData.response_url || null,
        image_url: null,
        status: 'pending',
        error: null,
      }
    })
  )

  return results.map((result, i) => {
    if (result.status === 'fulfilled') return result.value
    return {
      index: scenes[i].index,
      status_url: null,
      response_url: null,
      image_url: null,
      status: 'error',
      error: result.reason?.message || 'Erreur soumission image',
    }
  })
}

// ═══════════════════════════════════════════════════════════════
// ROUTE POST — Lancer le pipeline
// ═══════════════════════════════════════════════════════════════

export async function POST(req: Request) {
  try {
    // 1. Auth
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // 2. Validation
    const { idea, tier, ambiance, musicMood } = await req.json()

    if (!idea || !tier) {
      return NextResponse.json(
        { error: 'idea et tier sont requis' },
        { status: 400 }
      )
    }

    const tierConfig = TIERS[tier]
    if (!tierConfig) {
      return NextResponse.json(
        { error: `Tier invalide: ${tier}` },
        { status: 400 }
      )
    }

    const creditsCost = tierConfig.credits

    // 3. Admin client (bypass RLS)
    const adminSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 4. Vérifier les crédits
    const { data: creditData } = await adminSupabase
      .from('credits')
      .select('balance, lifetime_spent')
      .eq('profile_id', user.id)
      .single()

    if (!creditData || creditData.balance < creditsCost) {
      return NextResponse.json(
        { error: `Crédits insuffisants. ${creditsCost} crédits requis.` },
        { status: 402 }
      )
    }

    // 5. Déduire les crédits
    await adminSupabase
      .from('credits')
      .update({
        balance: creditData.balance - creditsCost,
        lifetime_spent: (creditData.lifetime_spent || 0) + creditsCost,
      })
      .eq('profile_id', user.id)

    await adminSupabase
      .from('credit_transactions')
      .insert({
        profile_id: user.id,
        amount: -creditsCost,
        type: 'spend',
        description: `Spark Vidéo ${tierConfig.scenes} scènes (${tier})`,
      })

    // 6. Gemini génère les scènes
    let scenes: Array<{ index: number; prompt: string }>
    try {
      scenes = await generateScenes(idea, tierConfig.scenes, ambiance || null)
    } catch (error) {
      // Rembourser si Gemini échoue
      await adminSupabase
        .from('credits')
        .update({
          balance: creditData.balance,
          lifetime_spent: (creditData.lifetime_spent || 0),
        })
        .eq('profile_id', user.id)

      await adminSupabase
        .from('credit_transactions')
        .insert({
          profile_id: user.id,
          amount: creditsCost,
          type: 'refund',
          description: 'Spark Vidéo - Remboursement (erreur scénario)',
        })

      console.error('Gemini scene generation failed:', error)
      return NextResponse.json(
        { error: 'Impossible de générer le scénario. Crédits remboursés.' },
        { status: 500 }
      )
    }

    // 7. Soumettre les images en parallèle
    const imageJobs = await submitImageJobs(scenes)

    // Vérifier qu'au moins 2 images ont été soumises
    const submittedCount = imageJobs.filter(j => j.status === 'pending').length
    if (submittedCount < 2) {
      // Rembourser
      await adminSupabase
        .from('credits')
        .update({
          balance: creditData.balance,
          lifetime_spent: (creditData.lifetime_spent || 0),
        })
        .eq('profile_id', user.id)

      await adminSupabase
        .from('credit_transactions')
        .insert({
          profile_id: user.id,
          amount: creditsCost,
          type: 'refund',
          description: 'Spark Vidéo - Remboursement (erreur images)',
        })

      return NextResponse.json(
        { error: 'Impossible de lancer la génération d\'images. Crédits remboursés.' },
        { status: 500 }
      )
    }

    // 8. Insérer le job dans Supabase
    const { data: job, error: insertError } = await adminSupabase
      .from('spark_video_jobs')
      .insert({
        user_id: user.id,
        status: 'images',
        idea,
        ambiance: ambiance || null,
        music_mood: musicMood || null,
        tier,
        scenes_count: tierConfig.scenes,
        duration_seconds: tierConfig.durationSec,
        credits_used: creditsCost,
        scenes,
        image_jobs: imageJobs,
      })
      .select('id')
      .single()

    if (insertError || !job) {
      console.error('Supabase insert error:', insertError)
      return NextResponse.json(
        { error: 'Erreur lors de la création du job' },
        { status: 500 }
      )
    }

    // 9. Retourner le jobId
    return NextResponse.json({
      success: true,
      jobId: job.id,
      scenesCount: scenes.length,
      credits_used: creditsCost,
      credits_remaining: creditData.balance - creditsCost,
    })
  } catch (error) {
    console.error('Spark Video generate error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
