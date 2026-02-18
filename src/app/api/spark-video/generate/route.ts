import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const KIE_API_KEY = process.env.KIE_API_KEY!
const FAL_KEY = process.env.FAL_KEY!

// Tiers de durée (dupliqué ici pour l'API — pas d'import client)
const TIERS: Record<string, { scenes: number; clipDuration: number; durationSec: number; credits: number }> = {
  flash:    { scenes: 2,  clipDuration: 5,  durationSec: 10, credits: 25 },
  teaser:   { scenes: 3,  clipDuration: 5,  durationSec: 15, credits: 30 },
  short:    { scenes: 5,  clipDuration: 5,  durationSec: 25, credits: 40 },
  standard: { scenes: 5,  clipDuration: 10, durationSec: 50, credits: 55 },
  tiktok:   { scenes: 6,  clipDuration: 10, durationSec: 60, credits: 65 },
  premium:  { scenes: 8,  clipDuration: 10, durationSec: 80, credits: 80 },
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
): Promise<{ subjectAnchor: string; scenes: Array<{ index: number; prompt: string; arc_role: string }> }> {

  const ambianceDirective = ambiance && AMBIANCE_DIRECTIVES[ambiance]
    ? `\n\nAMBIANCE OBLIGATOIRE :\n${AMBIANCE_DIRECTIVES[ambiance]}`
    : '\nChoisis l\'ambiance la plus adaptée à l\'idée. Sois CRÉATIF.'

  // Arc narratif adapté au nombre de scènes
  let arcInstruction: string
  if (scenesCount <= 2) {
    arcInstruction = `- Scène 1 (arc_role: "hook") : image qui ARRÊTE le scroll, situation surprenante ou spectaculaire
- Scène 2 (arc_role: "resolution") : conclusion satisfaisante`
  } else if (scenesCount <= 4) {
    arcInstruction = `- Scène 1 (arc_role: "hook") : image qui ARRÊTE le scroll, situation surprenante
- Scènes intermédiaires (arc_role: "rise") : montée en puissance, détails impressionnants
- Dernière scène (arc_role: "resolution") : conclusion satisfaisante`
  } else {
    arcInstruction = `- Scène 1 (arc_role: "hook") : image qui ARRÊTE le scroll, situation surprenante/spectaculaire
- Scènes 2 à ${scenesCount - 2} (arc_role: "rise") : montée en puissance, détails impressionnants
- Avant-dernière scène (arc_role: "climax") : moment fort, apogée de l'action
- Dernière scène (arc_role: "resolution") : conclusion satisfaisante, émotion positive`
  }

  const systemPrompt = `Tu es un SCÉNARISTE IA expert en vidéos courtes virales (TikTok, Instagram Reels). Tu crées des scènes visuellement COHÉRENTES avec un arc narratif captivant.
${ambianceDirective}

═══ ÉTAPE 1 : SUBJECT ANCHOR ═══

AVANT de générer les scènes, crée un "subject_anchor" : une description visuelle ULTRA-DÉTAILLÉE du sujet principal (80-120 mots en anglais).

Cette description DOIT inclure :
- Apparence physique précise (âge, corpulence, couleur de peau, coiffure, traits du visage)
- Vêtements exacts (couleurs, matières, accessoires)
- Expressions faciales caractéristiques
- Tout détail distinctif (tatouages, bijoux, cicatrices)

Si le sujet n'est pas une personne (objet, animal, lieu), décris-le avec le même niveau de détail visuel.

CRUCIAL : Cette description sera COPIÉE VERBATIM au début de CHAQUE prompt de scène pour garantir la cohérence visuelle.

═══ ÉTAPE 2 : ${scenesCount} SCÈNES AVEC ARC NARRATIF ═══

${arcInstruction}

═══ RÈGLES ABSOLUES ═══

1. Génère EXACTEMENT ${scenesCount} scènes
2. Chaque prompt COMMENCE par le subject_anchor VERBATIM puis ajoute la scène spécifique
3. Chaque prompt en ANGLAIS (pour fal.ai flux-pro)
4. Chaque prompt SOUS 900 caractères (subject_anchor inclus)
5. Format portrait 9:16 (vertical)
6. Style PHOTO-RÉALISTE (pas cartoon, pas illustration)
7. Pas de texte dans l'image, pas de sous-titres
8. Pas de termes de caméra ("camera pans", "zoom in")
9. Chaque scène = UN seul moment figé, UNE action précise

═══ QUALITÉ DES PROMPTS ═══

Après le subject_anchor, chaque prompt ajoute :
- L'ACTION précise de cette scène
- L'ENVIRONNEMENT spécifique (peut changer entre scènes)
- Les DÉTAILS SENSORIELS (vapeur, reflets, poussière, lumière, textures)

═══ FORMAT DE RÉPONSE ═══

UNIQUEMENT du JSON, sans markdown, sans backticks :
{"subject_anchor":"A tall muscular Black man in his 30s with short fade haircut, deep brown eyes, warm confident smile, wearing a bright red chef apron over white t-shirt, flour-dusted strong hands with silver watch on left wrist, small scar above right eyebrow, broad shoulders, clean-shaven face with defined jawline...","scenes":[{"index":0,"prompt":"[subject_anchor copié ici] standing in a sun-drenched rustic kitchen...","arc_role":"hook"},{"index":1,"prompt":"[subject_anchor copié ici] intensely focused, kneading dough...","arc_role":"rise"}]}`

  const response = await fetch('https://api.kie.ai/gemini-3-pro/v1/chat/completions', {
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
            text: `IDÉE DE VIDÉO : "${idea}"\n\nGénère d'abord le subject_anchor (80-120 mots), puis ${scenesCount} scènes avec arc narratif. Chaque prompt COMMENCE par le subject_anchor VERBATIM.`,
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

  const subjectAnchor = parsed.subject_anchor || ''
  const totalScenes = parsed.scenes.length

  return {
    subjectAnchor,
    scenes: parsed.scenes.map((s: { index?: number; prompt: string; arc_role?: string }, i: number) => ({
      index: s.index ?? i,
      prompt: s.prompt,
      arc_role: s.arc_role || (i === 0 ? 'hook' : i >= totalScenes - 1 ? 'resolution' : i >= totalScenes - 2 ? 'climax' : 'rise'),
    })),
  }
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

    // 6. Gemini génère les scènes (avec Subject Anchor + Arc Narratif)
    let scenes: Array<{ index: number; prompt: string; arc_role: string }>
    let subjectAnchor: string = ''
    try {
      const result = await generateScenes(idea, tierConfig.scenes, ambiance || null)
      scenes = result.scenes
      subjectAnchor = result.subjectAnchor
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
    // Insert du job (subject_anchor ajouté séparément pour compatibilité migration)
    const insertPayload: Record<string, unknown> = {
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
    }

    // Tenter d'inclure subject_anchor (la colonne peut ne pas encore exister)
    let { data: job, error: insertError } = await adminSupabase
      .from('spark_video_jobs')
      .insert({ ...insertPayload, subject_anchor: subjectAnchor || null })
      .select('id')
      .single()

    // Si l'erreur est "column does not exist", réessayer sans subject_anchor
    if (insertError?.code === '42703') {
      console.warn('subject_anchor column not found, inserting without it')
      const retry = await adminSupabase
        .from('spark_video_jobs')
        .insert(insertPayload)
        .select('id')
        .single()
      job = retry.data
      insertError = retry.error
    }

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
