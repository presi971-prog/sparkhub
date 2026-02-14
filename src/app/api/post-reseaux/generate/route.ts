import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

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
}

// Agent IA unique : analyse la photo + contexte pro → génère prompt compositing + légende + hashtags
async function analyzeAndGenerate(
  photoUrl: string,
  businessType: string,
  postStyle: string,
  businessName: string,
  message: string,
  photoUrl2?: string
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
- Garder le SUJET PRINCIPAL reconnaissable
- Décrire la TRANSFORMATION COMPLÈTE : nouveau décor, nouveaux vêtements si c'est une personne, nouveaux accessoires, nouvelle ambiance
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
→ La coiffure/maquillage/ongles reconnaissables. SHOOTING INSTAGRAM PRO : la personne projetée dans un shooting photo pro avec ring light visible, fond tendance coloré (rose, lilas ou néon), pose d'influenceuse. Tenue stylée assortie au look. L'image est le genre de post qui fait 10 000 likes.

[B2] "Avant / Après" :
→ Les 2 photos (avant et après) fournies. COUVERTURE DE VOGUE : la personne EN PIED avec une tenue de soirée ou classique chic, bijoux en or, boucles d'oreilles assorties à la coiffure. Fond studio de luxe, éclairage de photographe de mode. Composition split screen dramatique montrant la transformation. L'image est si pro qu'on croirait une vraie couverture de magazine.

[B3] "Nouveauté" :
→ Le résultat reconnaissable. CLIP MUSICAL TROPICAL : la personne sur une plage au coucher du soleil, tenue stylée qui vole au vent (robe, chemise, costume selon le genre), pieds dans l'eau. Palmiers, fleurs d'hibiscus. Lumière dorée magique. Ambiance Beyoncé/Burna Boy aux Antilles. Le look est la star.

[B4] "Ambiance" :
→ Le salon reconnaissable. SPA DE PALACE À BALI : le salon transformé avec piscine intérieure, cascades d'eau, murs en bambou et pierre volcanique, orchidées géantes partout, brume légère, lumière filtrée à travers une canopée tropicale. Clientes en peignoirs de soie. Le luxe absolu.

═══ ARTISAN ═══

[A1] "Promotion" :
→ La réalisation reconnaissable. PAGE DE MAGAZINE DÉCO (type Côté Maison) : la réalisation présentée avec un éclairage parfait, tout brille, serviettes roulées si salle de bain, plante verte, accessoires déco. Le cadrage et la lumière sont ceux d'un photographe professionnel de déco. Le client se dit "je veux la même chez moi".

[A2] "Avant / Après" :
→ Les 2 photos (avant et après) fournies. SPLIT SCREEN TV (type émission de rénovation) : gauche = le chantier avant, sombre et vieillot. Droite = le résultat qui brille, lumineux, moderne. Le contraste est spectaculaire et prouve le savoir-faire. Présentation dramatique comme dans les émissions télé.

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
→ Le sujet reconnaissable. SUPER-HÉROS : le coach/l'athlète en tenue de sport futuriste, flottant légèrement au-dessus du sol, aura d'énergie bleue-électrique autour du corps. Fond sombre orageux, éclairs. Look affiche Marvel. "Ce coach va te transformer."

[S2] "Avant / Après" :
→ Les 2 photos (avant et après) fournies. CHRYSALIDE → PAPILLON : gauche = la personne enveloppée dans un cocon sombre et gris. Droite = la personne qui éclate de lumière, des ailes lumineuses se déploient derrière, couleurs vives. Métamorphose spectaculaire et inspirante.

[S3] "Nouveauté" :
→ Le sujet reconnaissable. SOMMET DE LA SOUFRIÈRE : le coach/la séance projetée au sommet du volcan de Guadeloupe, au-dessus des nuages, lever du soleil derrière, forêt tropicale en contrebas. Au-dessus du monde. Sérénité et puissance.

[S4] "Performance" :
→ Le sujet reconnaissable. EXPLOSION DE PUISSANCE : le sportif traverse un mur qui se brise en mille morceaux, débris figés dans l'air. Éclairs d'énergie, éclairage dramatique. Scène de film d'action hollywoodien.

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
→ Les 2 photos (avant et après) fournies. RÉSURRECTION : gauche = l'épave dans une casse automobile (rouille, poussière, ciel gris, corbeau). Droite = le MÊME véhicule rutilant sous les projecteurs d'un salon automobile, sol miroir, velours rouge. De la mort à la gloire.

[V3] "Nouveauté" :
→ Le véhicule reconnaissable. SHOOTING TOP GEAR : Route de la Traversée en Guadeloupe, forêt tropicale, brume matinale. Prise de vue dynamique type hélicoptère. Le véhicule brille. Magazine automobile de luxe.

═══ ÉVÉNEMENTIEL ═══

[E1] "Promotion" :
→ Le sujet reconnaissable. STADE DE 50 000 PERSONNES : le DJ/artiste sur une scène géante type Tomorrowland, écrans LED géants, 50 000 personnes avec téléphones levés. Feux d'artifice. Fumée et lasers. "Cet artiste remplit des stades."

[E2] "Nouveauté" :
→ Le sujet reconnaissable. MARIAGE ROYAL : salle de château, plafond cathédrale, milliers de roses suspendues, lustre en cristal géant, tables avec vaisselle en or. Invités en tenues de gala. Conte de fées.

[E3] "Ambiance" :
→ Le lieu reconnaissable. FESTIVAL SUR LA PLAGE : scène sur la plage des Caraïbes au coucher du soleil, foule qui danse pieds dans le sable, palmiers décorés de guirlandes, feu de camp géant, DJ booth illuminé. La fête + le paradis.

[E4] "Performance" :
→ Le sujet reconnaissable. MOMENT DU DROP : confettis et flammes qui jaillissent de la scène, mains de milliers de personnes levées, lumières stroboscopiques figées. L'instant où tout le monde perd la tête.

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

  const userPrompt = postStyle === 'avant_apres' && photoUrl2
    ? `Tu as reçu 2 photos : la première est le AVANT, la deuxième est le APRÈS. Compose une image spectaculaire qui montre la transformation. Exécute tes 2 missions.`
    : `Analyse cette photo et exécute tes 2 missions. Projette le sujet dans l'univers décrit ci-dessus. Sois AUDACIEUX et CINÉMATOGRAPHIQUE.`

  try {
    const response = await fetch('https://api.kie.ai/gemini-2.5-flash/v1/chat/completions', {
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
            ...(photoUrl2 ? [{ type: 'image_url' as const, image_url: { url: photoUrl2 } }] : []),
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
    const transformFooter = `\n\nCRITICAL: The MAIN SUBJECT must remain RECOGNIZABLE (same face, same dish, same product, same work). Everything else can and SHOULD be dramatically transformed: background, environment, clothing, accessories, lighting, atmosphere. Be bold and cinematic. The result should look like a professional advertising campaign or movie scene, not a simple photo edit.`

    return {
      editPrompt: (parsed.editPrompt || 'Using the provided image, keep the main subject recognizable and project it into a stunning, cinematic environment.') + transformFooter,
      caption: parsed.caption || '',
      hashtags: parsed.hashtags || '',
    }
  } catch (error) {
    console.error('Analyze AI error:', error)
    const name = businessName || 'chez nous'

    // Fallback : prompt générique compositing + légende basique
    const fallbackPrompts: Record<string, string> = {
      restaurant: 'Using the provided image, keep the dish exactly as it is and place it on an elegant wooden table with warm restaurant lighting in the background.',
      artisan: 'Using the provided image, keep the work/result exactly as it is and place it on a clean, neutral background with bright uniform lighting.',
      beaute: 'Using the provided image, keep the subject exactly as it is and enhance the environment with soft, flattering studio lighting and a clean backdrop.',
      commerce: 'Using the provided image, keep the product exactly as it is and place it in a professional advertising setting with clean studio lighting.',
      sport: 'Using the provided image, keep the subject exactly as it is and place them in a dynamic sports environment with dramatic lighting and energy.',
      tourisme: 'Using the provided image, keep the place exactly as it is and enhance with tropical paradise atmosphere, blue sky, and warm natural light.',
      auto: 'Using the provided image, keep the vehicle/work exactly as it is and place it in a clean professional garage or showroom setting.',
      evenementiel: 'Using the provided image, keep the subject exactly as it is and place in a festive, vibrant event atmosphere with dramatic lighting.',
    }

    return {
      editPrompt: (fallbackPrompts[businessType] || 'Using the provided image, keep the main subject intact and place it in a clean, professional environment with warm lighting.') +
        '\n\nCRITICAL: Keep the MAIN SUBJECT exactly as it is — same shape, colors, textures. Only change the background and environment around it.',
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

    const { imageUrl, imageUrl2, businessType, businessName, postStyle, message } = await req.json()

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
      imageUrl, businessType, postStyle, businessName || '', message || '', imageUrl2 || undefined
    )

    console.log('Edit prompt generated:', editPrompt.slice(0, 200))

    // 2. Soumettre le job fal.ai avec le prompt sur mesure
    let falStatusUrl: string | null = null
    let falResponseUrl: string | null = null
    let falError: string | null = null

    try {
      const submitResponse = await fetch('https://queue.fal.run/fal-ai/nano-banana-pro/edit', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${FAL_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: editPrompt,
          image_urls: imageUrl2 ? [imageUrl, imageUrl2] : [imageUrl],
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
