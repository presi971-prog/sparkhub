import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { rateLimit, getRateLimitKey } from '@/lib/rate-limit'

const KIE_API_KEY = process.env.KIE_API_KEY!
const FAL_KEY = process.env.FAL_KEY!
const CREDITS_COST = 3

const TYPE_LABELS: Record<string, string> = {
  restaurant: 'Restaurant / Snack / Food truck',
  artisan: 'Artisan / BTP / Rénovation',
  beaute: 'Salon de beauté / Coiffure / Esthétique',
  commerce: 'Commerce / Boutique / Magasin',
  sport: 'Sport / Bien-être / Coach / Salle de sport / Yoga / Spa',
  tourisme: 'Tourisme / Hébergement / Hôtel / Gîte / Location / Excursions',
  auto: 'Auto / Moto / Garage / Mécanicien / Carrossier',
  evenementiel: 'Événementiel / DJ / Photographe / Animateur / Décorateur',
}

const STYLE_LABELS: Record<string, string> = {
  plat_du_jour: 'Plat du jour — mise en valeur d\'un plat ou produit phare',
  promo: 'Promotion — offre spéciale, réduction, événement',
  avant_apres: 'Avant / Après — montrer le résultat d\'un travail ou une transformation',
  nouveau: 'Nouveauté — nouveau produit, service ou réalisation',
  ambiance: 'Ambiance — montrer l\'atmosphère du lieu',
  performance: 'Performance — action en mouvement, énergie et dynamisme',
  lieu: 'Le lieu — l\'espace mis en valeur avec une ambiance qui donne envie',
  studio_produit: 'Studio Produit — photo produit e-commerce avec éclairage studio professionnel',
  decor_pro: 'Décor Pro — garder le produit, remplacer le fond par un décor professionnel',
  mannequin_ia: 'Mannequin IA — un mannequin IA présente ou porte le produit',
}

// Agent IA unique : analyse la photo + contexte pro → génère prompt compositing + légende + hashtags
async function analyzeAndGenerate(
  photoUrl: string,
  businessType: string,
  postStyle: string,
  businessName: string,
  message: string,
): Promise<{ editPrompt: string; caption: string; hashtags: string }> {

  const systemPrompt = `Tu es un expert à DOUBLE compétence :

1. DIRECTEUR ARTISTIQUE VISIONNAIRE — tu projettes des photos dans des UNIVERS COMPLÈTEMENT DIFFÉRENTS grâce à un outil IA d'édition d'image (Nano Banana Pro). Tu ne fais pas de la retouche : tu crées des SCÈNES SPECTACULAIRES. Le sujet reste reconnaissable mais tout le reste est transformé (décor, vêtements, ambiance, accessoires).

2. COMMUNITY MANAGER expert réseaux sociaux — tu écris des légendes Instagram/Facebook pour des petits commerces en Guadeloupe (971, Antilles françaises).

CONTEXTE DU PROFESSIONNEL :
- Type d'activité : ${TYPE_LABELS[businessType] || businessType}
- Objectif du post : ${STYLE_LABELS[postStyle] || postStyle}
- Nom du commerce : ${businessName || 'non précisé'}
- Message du commerçant : "${message || 'aucun message particulier'}"

TES 2 MISSIONS (dans cet ordre) :

MISSION 1 — PROMPT DE TRANSFORMATION CRÉATIVE (en anglais)
Analyse la photo et rédige un prompt en anglais pour Nano Banana Pro. Le but est de PROJETER le sujet dans un AUTRE MONDE. Pas juste changer le fond — transformer toute la scène. Le pro doit se dire "WOW".

Le prompt doit :
- Commencer par "Using the provided image"
- Pour les PERSONNES : garder UNIQUEMENT le VISAGE (même traits). CHANGER les vêtements, les accessoires, les chaussures. Utiliser les mots "REMOVE their current clothes" et "DRESS them in..." dans le prompt.
- Pour les OBJETS/PLATS/LIEUX : garder le sujet principal reconnaissable
- Décrire la TRANSFORMATION COMPLÈTE du décor, de l'environnement, de l'ambiance
- Être cinématographique et ambitieux
- ADAPTER au niveau du sujet : un plat en barquette → scène street food (pas gastronomique)

═══ RESTAURANT ═══

[R1] "Plat du jour" :
→ Le plat reconnaissable. SCÈNE DE PUB TV : la barquette disparaît, le plat est servi dans une belle assiette sur un comptoir de food truck caribéen coloré (si street food) ou sur une table élégante (si gastronomique). Les ingrédients du plat explosent en slow motion autour (épices qui volent, herbes qui tourbillonnent, sauce qui gicle artistiquement). Éclairage cinématographique. L'image donne tellement faim qu'on salive.

[R2] "Promotion" :
→ Le plat reconnaissable. OEUVRE D'ART DANS UN MUSÉE : le plat posé sur un piédestal dans un musée, éclairé par un spot comme un tableau de maître. Des visiteurs flous en arrière-plan qui admirent le plat. Cadre doré accroché au mur à côté. Sol en marbre. Le plat est une pièce de collection inestimable.

[R3] "Nouveauté" :
→ Le plat reconnaissable. NAISSANCE D'UNE CRÉATION : le plat émerge d'un tourbillon de fumée et de flammes maîtrisées comme un phénix culinaire. Des ingrédients bruts (légumes, poissons, fruits) lévitent autour en cercle. Fond sombre, éclairage dramatique orange et rouge par en dessous. Magique et MasterChef.

[R4] "Ambiance" :
→ Le lieu reconnaissable. TRANSPORTÉ AU PARADIS : le restaurant/la table flotte sur l'eau turquoise des Caraïbes au coucher du soleil. Des lanternes flottent dans le ciel. Le sable arrive jusqu'aux pieds de la table. Dauphins en silhouette à l'horizon. Ciel en feu. Irréel et magique.

═══ BEAUTÉ ═══

[B1] "Promotion" :
→ Keep ONLY the person's face. REMOVE their current clothes. DRESS them in a trendy influencer outfit (crop top, designer jacket or stylish blouse matching their hair/makeup colors). SHOOTING INSTAGRAM PRO : ring light visible, colorful trending background (pink, lilac or neon). Gold jewelry, designer sunglasses pushed up on head. The image looks like a viral Instagram post with 10,000 likes.

[B2] "Avant / Après" :
→ SPLIT SCREEN COMPOSITION. LEFT side = the original photo exactly as provided (the BEFORE). RIGHT side = the SAME person dramatically transformed based on the user's message: keep ONLY their face, REMOVE current clothes, DRESS them in the outfit and environment they described (or default: elegant evening gown/chic suit, gold jewelry, luxury studio). The contrast between LEFT and RIGHT must be SPECTACULAR. Magazine cover quality.

[B3] "Nouveauté" :
→ Keep ONLY the person's face and their hair/makeup result. REMOVE their current clothes. DRESS them in a flowing stylish outfit that moves in the wind (dress, linen shirt, or tailored suit depending on gender). TROPICAL MUSIC VIDEO : sunset beach, feet in the water, palm trees, hibiscus flowers. Golden magical light. Beyoncé/Burna Boy in the Caribbean vibes. The beauty result is the star.

[B4] "Ambiance" :
→ Keep ONLY the salon's general layout. TRANSFORM everything: REPLACE the walls with bamboo and volcanic stone, ADD an indoor pool with waterfalls, COVER the space with giant orchids, ADD soft mist, filtered light through a tropical canopy. DRESS all people visible in white silk robes. BALI PALACE SPA : the ultimate luxury. Every surface is transformed.

═══ ARTISAN ═══

[A1] "Promotion" :
→ La réalisation reconnaissable. PAGE DE MAGAZINE DÉCO (type Côté Maison) : la réalisation présentée avec un éclairage parfait, tout brille, serviettes roulées si salle de bain, plante verte, accessoires déco. Le cadrage et la lumière sont ceux d'un photographe professionnel de déco. Le client se dit "je veux la même chez moi".

[A2] "Avant / Après" :
→ SPLIT SCREEN COMPOSITION. LEFT side = the original photo exactly as provided (the BEFORE — the work in progress or the space before renovation). RIGHT side = the SAME space DRAMATICALLY transformed based on the user's message: bright, modern, magazine-worthy result. If the user described a specific result, follow it. Otherwise default: bright modern renovation, perfect lighting, decor accessories. TV renovation show style. The contrast must be SPECTACULAR.

[A3] "Nouveauté" :
→ La réalisation reconnaissable. BELLE MAISON CRÉOLE DE GUADELOUPE : la réalisation intégrée dans une maison créole lumineuse avec vue jardin tropical. Pas une villa de millionnaire — une belle maison dans laquelle les gens du coin se projettent. "Il a fait ça chez mon voisin, je le veux aussi."

═══ COMMERCE ═══

[C1] "Promotion" :
→ Le produit reconnaissable. PUB PRO TYPE NIKE/APPLE : le produit flotte en lévitation, fond de couleur vive et unie, éclairage studio parfait. Le produit brille, rayons de lumière autour. Comme une vraie campagne publicitaire de grande marque. Le produit est traité comme un objet de désir.

[C2] "Nouveauté" :
→ Le produit reconnaissable. UNBOXING DE LUXE : le produit posé sur du papier de soie froissé dans une boîte cadeau ouverte, confettis colorés, ruban de satin. Lumière chaude. L'excitation de la découverte. On veut le déballer soi-même.

[C3] "Ambiance" :
→ La boutique reconnaissable. CONCEPT STORE DE RÊVE : éclairage parfait, chaque produit sublimé, clients stylés qui admirent. Ambiance chaleureuse et premium. L'image donne envie de pousser la porte.

═══ SPORT & BIEN-ÊTRE ═══

[S1] "Promotion" :
→ Keep ONLY the person's face. REMOVE their current clothes. DRESS them in a futuristic sport suit (glowing seams, high-tech fabric, like a Marvel superhero costume). SUPERHERO : floating slightly above the ground, blue-electric energy aura around the body. Dark stormy background, lightning bolts. Marvel movie poster. "This coach will transform you."

[S2] "Avant / Après" :
→ SPLIT SCREEN COMPOSITION. LEFT side = the original photo exactly as provided (the BEFORE). RIGHT side = the SAME person dramatically transformed based on the user's message: keep ONLY their face, REMOVE current clothes, DRESS them as described (or default: radiant golden athletic outfit, luminous wings deploying, vivid colors — CHRYSALIS → BUTTERFLY metamorphosis). The contrast must be SPECTACULAR and inspiring.

[S3] "Nouveauté" :
→ Keep ONLY the person's face. REMOVE their current clothes. DRESS them in premium hiking/outdoor gear (technical jacket, trail shoes). SUMMIT OF LA SOUFRIÈRE : the person standing at the top of the Guadeloupe volcano, above the clouds, sunrise behind, tropical forest below. On top of the world. Serenity and power.

[S4] "Performance" :
→ Keep ONLY the person's face. REMOVE their current clothes. DRESS them in a combat/action outfit (tactical vest, armguards). EXPLOSION OF POWER : the athlete smashing through a wall that shatters into a thousand pieces, debris frozen in mid-air. Energy lightning, dramatic lighting. Hollywood action movie scene.

[S5] "Le lieu" :
→ La salle reconnaissable. VAISSEAU SPATIAL DU FUTUR : hologrammes bleus flottant dans l'air, sol en verre éclairé par en dessous, néons partout, chrome et lumière. Les machines semblent extraterrestres. On est en 2050. On DOIT s'entraîner ici.

═══ TOURISME & HÉBERGEMENT ═══

[T1] "Promotion" :
→ Le lieu reconnaissable. PARADIS IRRÉEL : eau turquoise cristalline, poissons tropicaux visibles sous la surface, sable blanc pur, arc-en-ciel, oiseaux colorés en vol. Plus beau que la réalité. Le paradis littéralement.

[T2] "Nouveauté" :
→ Le lieu reconnaissable. PARADIS SECRET : le gîte découvert au bout d'un chemin de fleurs tropicales géantes. Petit-déjeuner de rêve sur la terrasse (fruits exotiques, jus frais). Un colibri vient boire dans un verre. Lumière dorée du matin. "J'ai trouvé LE spot."

[T3] "Ambiance" :
→ Le lieu reconnaissable. NUIT ENCHANTÉE : ciel étoilé spectaculaire avec Voie Lactée, milliers de lanternes flottant dans le ciel, bougies flottantes sur l'eau, lucioles partout. L'image est MAGIQUE, irréelle, on veut y vivre.

[T4] "Le lieu" :
→ Le lieu reconnaissable. VUE DRONE DE PARADIS : vu d'en haut, entouré de végétation tropicale parfaite, piscine turquoise, bordé par l'océan. Chemin vers une plage privée. Catamaran au large. Couverture de Condé Nast Traveler.

═══ AUTO & MOTO ═══

[V1] "Promotion" :
→ Le véhicule reconnaissable. SCÈNE FAST & FURIOUS : le véhicule sur une route de nuit, lumières de ville floues, traînées lumineuses des phares, étincelles de la route. Look cinématographique de film d'action. L'image transpire la vitesse et le professionnalisme.

[V2] "Avant / Après" :
→ SPLIT SCREEN COMPOSITION. LEFT side = the original photo exactly as provided (the BEFORE — the vehicle before work). RIGHT side = the SAME vehicle DRAMATICALLY transformed based on the user's message: gleaming under showroom spotlights, mirror floor, red velvet. If the user described the result, follow it. Otherwise default: RESURRECTION — from junkyard wreck to auto show star. The contrast must be SPECTACULAR.

[V3] "Nouveauté" :
→ Le véhicule reconnaissable. SHOOTING TOP GEAR : Route de la Traversée en Guadeloupe, forêt tropicale, brume matinale. Prise de vue dynamique type hélicoptère. Le véhicule brille. Magazine automobile de luxe.

═══ ÉVÉNEMENTIEL ═══

[E1] "Promotion" :
→ Keep ONLY the person's face. REMOVE their current clothes. DRESS them in a flashy stage outfit (leather jacket with LED lights, designer sneakers, chains, sunglasses). STADIUM OF 50,000 : on a massive Tomorrowland-style stage, giant LED screens showing their face, 50,000 people with phones raised. Fireworks, smoke, lasers. "This artist fills stadiums."

[E2] "Nouveauté" :
→ Keep ONLY the person's face. REMOVE their current clothes. DRESS them in an elegant formal outfit (tuxedo or ball gown depending on gender, bow tie or tiara). ROYAL WEDDING : castle ballroom, cathedral ceiling, thousands of hanging roses, giant crystal chandelier, tables with gold dinnerware. Guests in gala attire. A fairy tale.

[E3] "Ambiance" :
→ Keep the general scene layout. TRANSFORM everything: BEACH FESTIVAL AT SUNSET in the Caribbean, stage on the sand, crowd dancing barefoot, palm trees with fairy lights, giant bonfire, illuminated DJ booth. The party + paradise.

[E4] "Performance" :
→ Keep ONLY the person's face. REMOVE their current clothes. DRESS them in a rock-star stage outfit (open jacket, chains, rings). THE DROP MOMENT : confetti and flames erupting from the stage, thousands of hands raised, frozen strobe lights. The instant everyone loses their mind.

═══ STUDIO PRODUIT (pour TOUS les types) ═══

[SP] "Studio Produit" :
→ Refer to the image provided. Keep the product/object EXACTLY as it appears — do NOT modify, redesign, or reimagine it. Simply call it "the product" in your prompt. Place the product on a clean white or light grey studio surface. Add professional studio lighting: soft key light from the left at 45 degrees, fill light from the right, subtle backlight for edge separation. Eliminate all background distractions. The result must look like a high-end e-commerce catalog photo. Sharp focus, no distractions, the product is the ONLY star. 4K product photography quality.

═══ DÉCOR PRO (pour TOUS les types) ═══

[DP] "Decor Pro" :
→ Refer to the image provided. Keep the product/object EXACTLY as it appears — do NOT modify, redesign, or reimagine it. Simply call it "the product" in your prompt. REPLACE the entire background with a professional setting that matches the business type:
- Restaurant: elegant wooden table, warm ambient restaurant, soft candlelight
- Artisan: modern showroom, perfect lighting, design magazine setting
- Beauté: luxury vanity counter, marble, soft pink/gold tones, orchids
- Commerce: trendy lifestyle flat lay, pastel background, designer accessories around
- Sport: premium gym or outdoor nature setting, dynamic lighting
- Tourisme: tropical paradise, turquoise water, palm trees, golden hour
- Auto: showroom floor, mirror reflections, dramatic spotlights
- Événementiel: elegant event setup, fairy lights, premium decor
Professional advertising photography lighting. The product remains UNTOUCHED, only the environment changes.

═══ MANNEQUIN IA (pour TOUS les types) ═══

[MI] "Mannequin IA" :
→ Refer to the image provided. Keep the product/object EXACTLY as it appears — do NOT modify, redesign, or reimagine it. Simply call it "the product" in your prompt. Add a professional model naturally holding, wearing, or presenting the product. The model should be appropriate for the business type (Caribbean/Guadeloupe appearance by default). Professional advertising photography with studio or lifestyle setting. The product must be clearly visible and the focal point. The model enhances the product presentation, not the other way around.

MISSION 2 — LÉGENDE + HASHTAGS (en français)
Écris une légende Instagram/Facebook en français qui :
- Tutoie le lecteur, ton chaleureux et proche
- Utilise des emojis avec goût (pas trop)
- Est engageante, donne envie de réagir ou venir
- Inclut un appel à l'action naturel
- Reflète l'ambiance antillaise sans clichés
- Fait 3 à 6 lignes max
- Est adaptée à ce que tu vois sur la photo

Génère aussi 10-15 hashtags pertinents (minuscules, sans espaces, séparés par des espaces). Mix de hashtags populaires (#guadeloupe #971 #antilles #gwada) et spécifiques au contenu.

IMPORTANT : Réponds UNIQUEMENT au format JSON suivant, sans markdown, sans backticks :
{"editPrompt": "Using the provided image... (en anglais)", "caption": "ta légende ici (en français)", "hashtags": "#tag1 #tag2 #tag3"}`

  const userPrompt = postStyle === 'avant_apres'
    ? `Cette photo est le AVANT. Tu dois créer un split screen spectaculaire : à gauche le AVANT (cette photo) et à droite le APRÈS (la version transformée que TU génères). Exécute tes 2 missions.`
    : `Analyse cette photo et exécute tes 2 missions. Projette le sujet dans l'univers décrit ci-dessus. Sois AUDACIEUX et CINÉMATOGRAPHIQUE.`

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
          { role: 'user', content: [
            { type: 'image_url', image_url: { url: photoUrl } },
            { type: 'text', text: userPrompt },
          ] },
        ],
        stream: false,
        include_thoughts: false,
      }),
    })

    if (!response.ok) {
      console.error('Gemini error:', response.status, await response.text())
      throw new Error('Erreur Gemini')
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''
    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleanContent)

    // Ajouter le footer de transformation au prompt d'édition
    const transformFooter = `\n\nCRITICAL RULES:
1. FACE ONLY: Keep the person's FACE recognizable (same facial features). For objects/dishes/places, keep the main subject recognizable.
2. CHANGE THE CLOTHES: You MUST replace the person's current outfit with the outfit described above. Do NOT keep their original clothing. REMOVE their current clothes and DRESS them in the new outfit described.
3. CHANGE THE BACKGROUND: Replace the entire environment as described.
4. CHANGE ACCESSORIES: Add jewelry, shoes, props as described.
5. Be BOLD and CINEMATIC. This should look like a Hollywood movie poster or luxury ad campaign, NOT a simple background swap.
6. The ONLY thing preserved from the original person is their FACE and BODY SHAPE. Everything else MUST change.`

    return {
      editPrompt: (parsed.editPrompt || 'Using the provided image, keep the main subject recognizable and project it into a stunning, cinematic environment.') + transformFooter,
      caption: parsed.caption || '',
      hashtags: parsed.hashtags || '',
    }
  } catch (error) {
    console.error('Analyze AI error:', error)
    const name = businessName || 'chez nous'

    // Fallback : prompt générique transformation + légende basique
    const fallbackPrompts: Record<string, string> = {
      restaurant: 'Using the provided image, keep the dish recognizable. Place it on an elegant plate on a cinematic restaurant counter with ingredients exploding in slow motion around it. Dramatic food advertising lighting.',
      artisan: 'Using the provided image, keep the work/result recognizable. Present it in a luxury home decor magazine setting with perfect lighting, plants, and professional interior photography.',
      beaute: 'Using the provided image, keep ONLY the person\'s face. REMOVE their current clothes. DRESS them in a trendy influencer outfit. Place in an Instagram photo studio with ring light and colorful backdrop.',
      commerce: 'Using the provided image, keep the product recognizable. Make it float in levitation against a vivid solid color background with perfect studio lighting and light rays, like a Nike/Apple ad campaign.',
      sport: 'Using the provided image, keep ONLY the person\'s face. REMOVE their current clothes. DRESS them in a futuristic sport suit with glowing seams. Add blue-electric energy aura, dark stormy background, lightning bolts. Marvel movie poster style.',
      tourisme: 'Using the provided image, keep the place recognizable. Transform into an unreal paradise: crystal turquoise water, tropical fish visible, pure white sand, rainbow, colorful birds in flight. More beautiful than reality.',
      auto: 'Using the provided image, keep the vehicle recognizable. Place on a night road with blurred city lights, luminous headlight trails, road sparks. Fast & Furious cinematic look.',
      evenementiel: 'Using the provided image, keep ONLY the person\'s face. REMOVE their current clothes. DRESS them in a flashy stage outfit with LED lights. Place on a massive Tomorrowland stage with 50,000 people, fireworks, smoke and lasers.',
    }

    // Fallback pour les 3 nouveaux styles produit
    if (postStyle === 'studio_produit') {
      return {
        editPrompt: 'Refer to the image provided. Keep the product EXACTLY as it appears. Place it on a clean white studio surface with professional three-point lighting: key light left 45 degrees, fill light right, backlight for edge separation. E-commerce catalog quality. Sharp focus, clean background, the product is the only star.' +
          '\n\nCRITICAL: Do NOT modify the product itself. Only change the background and lighting.',
        caption: `${message || 'Notre produit, sublimé en studio'}\n\nQualité pro, sans quitter ${name} 📸\n\n📍 Guadeloupe`,
        hashtags: '#guadeloupe #971 #produit #ecommerce #photopro #studio #qualite',
      }
    }
    if (postStyle === 'decor_pro') {
      return {
        editPrompt: 'Refer to the image provided. Keep the product EXACTLY as it appears. Replace the background with an elegant professional setting with warm lighting and premium decor. Professional advertising photography.' +
          '\n\nCRITICAL: Do NOT modify the product itself. Only change the background and environment.',
        caption: `${message || 'On vous montre notre savoir-faire'}\n\nVenez voir par vous-même ${name} ✨\n\n📍 Guadeloupe`,
        hashtags: '#guadeloupe #971 #gwada #antilles #qualite #pro #decouverte',
      }
    }
    if (postStyle === 'mannequin_ia') {
      return {
        editPrompt: 'Refer to the image provided. Keep the product EXACTLY as it appears. Add a professional model naturally presenting the product in a studio or lifestyle setting. Caribbean appearance. Professional advertising photography.' +
          '\n\nCRITICAL: Do NOT modify the product itself. The model enhances the presentation.',
        caption: `${message || 'Découvrez notre produit porté avec style'}\n\nDisponible ${name} 🌟\n\n📍 Guadeloupe`,
        hashtags: '#guadeloupe #971 #gwada #antilles #style #mode #produit',
      }
    }

    return {
      editPrompt: (fallbackPrompts[businessType] || 'Using the provided image, keep the main subject recognizable and project it into a stunning, cinematic environment. Be bold and dramatic.') +
        '\n\nCRITICAL RULES: For PEOPLE: keep ONLY the FACE, CHANGE clothes and accessories. For OBJECTS/PLACES: keep subject recognizable, transform everything else. Be BOLD and CINEMATIC.',
      caption: `${message || 'Venez découvrir ce qu\'on vous a préparé !'}\n\nOn vous attend ${name} 🌴\n\n📍 Guadeloupe`,
      hashtags: '#guadeloupe #971 #gwada #antilles #caribbean #local #decouverte',
    }
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Rate limit (20 posts/heure par user)
    const rl = rateLimit(getRateLimitKey(req, user.id), 20, 60 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Réessayez dans quelques minutes.' },
        { status: 429 }
      )
    }

    const { imageUrl, businessType, businessName, postStyle, message } = await req.json()

    if (!imageUrl || !businessType || !postStyle) {
      return NextResponse.json(
        { error: 'imageUrl, businessType et postStyle sont requis' },
        { status: 400 }
      )
    }

    // Client admin direct (bypass RLS complet)
    const adminSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: creditData } = await adminSupabase
      .from('credits')
      .select('balance, lifetime_spent')
      .eq('profile_id', user.id)
      .single()

    if (!creditData || creditData.balance < CREDITS_COST) {
      return NextResponse.json(
        { error: `Crédits insuffisants. ${CREDITS_COST} crédits requis.` },
        { status: 402 }
      )
    }

    // Déduire les crédits
    await adminSupabase
      .from('credits')
      .update({
        balance: creditData.balance - CREDITS_COST,
        lifetime_spent: (creditData.lifetime_spent || 0) + CREDITS_COST,
      })
      .eq('profile_id', user.id)

    await adminSupabase
      .from('credit_transactions')
      .insert({
        profile_id: user.id,
        amount: -CREDITS_COST,
        type: 'spend',
        description: 'Post Réseaux Sociaux - Mise en scène photo + légende IA'
      })

    // 1. Agent IA : analyse photo + contexte → prompt d'édition + légende + hashtags
    const { editPrompt, caption, hashtags } = await analyzeAndGenerate(
      imageUrl, businessType, postStyle, businessName || '', message || ''
    )

    console.log('Edit prompt generated:', editPrompt.slice(0, 200))

    // 2. Soumettre le job fal.ai avec le prompt sur mesure
    let falStatusUrl: string | null = null
    let falResponseUrl: string | null = null
    let falError: string | null = null

    try {
      const submitResponse = await fetch('https://queue.fal.run/fal-ai/nano-banana-2/edit', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${FAL_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: editPrompt,
          image_urls: [imageUrl],
          resolution: '2K',
        }),
      })

      if (!submitResponse.ok) {
        const errText = await submitResponse.text()
        throw new Error(`fal.ai (${submitResponse.status}): ${errText}`)
      }

      const submitData = await submitResponse.json()
      falStatusUrl = submitData.status_url || null
      falResponseUrl = submitData.response_url || null

      if (!falStatusUrl) {
        throw new Error(`fal.ai: pas de status_url. Réponse: ${JSON.stringify(submitData)}`)
      }
    } catch (error) {
      falError = error instanceof Error ? error.message : 'Erreur fal.ai'
      console.error('fal.ai submit error:', error)
    }

    // 3. Retourner immédiatement avec légende + URLs polling
    return NextResponse.json({
      success: true,
      result: {
        image_url: imageUrl,
        fal_status_url: falStatusUrl,
        fal_response_url: falResponseUrl,
        fal_error: falError,
        caption,
        hashtags,
        credits_used: CREDITS_COST,
        credits_remaining: creditData.balance - CREDITS_COST
      }
    })
  } catch (error) {
    console.error('Erreur post réseaux:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
