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
  message: string
): Promise<{ editPrompt: string; caption: string; hashtags: string }> {

  const systemPrompt = `Tu es un expert à DOUBLE compétence :

1. DIRECTEUR ARTISTIQUE publicitaire — tu analyses des photos de produits/réalisations et tu rédiges des instructions de COMPOSITING pour un outil IA d'édition d'image (Nano Banana Pro). Ton objectif : garder le sujet principal INTACT et générer un environnement/décor adapté autour.

2. COMMUNITY MANAGER expert réseaux sociaux — tu écris des légendes Instagram/Facebook pour des petits commerces en Guadeloupe (971, Antilles françaises).

CONTEXTE DU PROFESSIONNEL :
- Type d'activité : ${TYPE_LABELS[businessType] || businessType}
- Objectif du post : ${STYLE_LABELS[postStyle] || postStyle}
- Nom du commerce : ${businessName || 'non précisé'}
- Message du commerçant : "${message || 'aucun message particulier'}"

TES 2 MISSIONS (dans cet ordre) :

MISSION 1 — PROMPT DE COMPOSITING PHOTO (en anglais)
Analyse la photo fournie et rédige un prompt en anglais pour Nano Banana Pro. Le prompt doit :
- Commencer par "Using the provided image"
- Identifier clairement le SUJET PRINCIPAL (le plat, le produit, le travail réalisé, la coiffure, etc.)
- ANALYSER le niveau de gamme du sujet (street food ou gastronomique ? salon de quartier ou luxe ? chantier basique ou rénovation haut de gamme ?) et ADAPTER le décor à ce niveau. Un décor trop luxueux pour un produit simple fait faux.
- Demander de GARDER le sujet principal INTACT (forme, couleurs, textures, détails)
- Donner des instructions TRÈS PRÉCISES et VISUELLEMENT DISTINCTES pour le décor

RÈGLES PAR COMBINAISON TYPE × STYLE :

═══ RESTAURANT ═══

"Plat du jour" + restaurant :
→ Le plat INTACT. ANALYSER : barquette/emballage → table en bois peinte de couleurs vives, fond mur de food truck ou comptoir de snack, lumière naturelle extérieure, ambiance déjeuner de rue caribéenne. Assiette dressée → nappe en tissu, couverts en inox, verre de vin, fond salle de restaurant flou avec lumière tamisée chaude. Le plat occupe 60% de l'image, vu d'en haut ou en légère plongée.

"Promotion" + restaurant :
→ Le plat INTACT, centré. Fond : surface unie de couleur contrastante (rouge vif, jaune moutarde, ou bleu profond selon les couleurs du plat). Un seul spot lumineux puissant d'en haut à droite qui crée une ombre nette. Look publicité affiche de fast-food ou carte de menu. Aucun élément décoratif — juste le plat, le fond, la lumière.

"Nouveauté" + restaurant :
→ Le plat INTACT. Fond : plan de travail en marbre blanc ou ardoise noire, vapeur/fumée légère qui s'élève autour du plat, éclairage latéral dramatique qui crée du volume. 2-3 ingrédients bruts (épices, herbes fraîches, piment) disposés artistiquement autour. Look "reveal" de nouveau menu.

"Ambiance" + restaurant :
→ Le lieu/la table INTACTS. Renforcer : lumière chaude orangée type fin d'après-midi, guirlandes lumineuses floues en arrière-plan, reflets dorés sur les surfaces. Si terrasse : ciel de coucher de soleil tropical, palmiers en silhouette. L'image doit donner envie de s'asseoir et commander.

═══ BEAUTÉ ═══

"Promotion" + beauté :
→ Le résultat (coiffure, maquillage, ongles) INTACT. Fond : couleur unie pastel (rose poudré, lilas, menthe) ou dégradé doux. Éclairage ring light frontal qui élimine les ombres et fait briller. Le sujet est centré, cadré serré. Look affiche de salon professionnel.

"Avant / Après" + beauté :
→ Le résultat INTACT. Fond : mur blanc ou gris très clair, éclairage studio uniforme des deux côtés. Netteté maximale, aucune distraction. Chaque détail du travail doit être visible (mèches, texture, couleur). L'image doit prouver le savoir-faire.

"Nouveauté" + beauté :
→ Le résultat INTACT. Fond : mur végétal avec feuillage tropical, ou surface en terrazzo moderne. Éclairage naturel doux type fenêtre latérale. Des éléments tendance autour (fleurs fraîches, produits cosmétiques flous en arrière-plan). Look post Instagram d'influenceuse beauté.

"Ambiance" + beauté :
→ Le salon/lieu INTACT. Renforcer : lumière tamisée chaleureuse, bougies, serviettes roulées, produits alignés. Tons crème, or et blanc. Reflets doux sur les miroirs. L'image doit évoquer le bien-être et la détente, donner envie de prendre rendez-vous.

═══ ARTISAN ═══

"Promotion" + artisan :
→ La réalisation INTACTE. Fond : mur béton brut ou brique, éclairage chantier puissant et direct. Un casque, un mètre ou un outil posé à côté pour l'échelle. Look "portfolio artisan pro". Image nette, contraste élevé.

"Avant / Après" + artisan :
→ Le résultat fini INTACT. Fond : strictement neutre (blanc ou gris clair), éclairage uniforme sans ombre. Angle droit, cadrage architectural. Chaque ligne, joint et finition doit être net et visible. L'image montre la qualité du travail.

"Nouveauté" + artisan :
→ La réalisation INTACTE. Fond : intérieur moderne et lumineux avec grandes baies vitrées, sol béton ciré ou parquet clair. Plantes vertes, lumière naturelle. L'image montre le résultat dans un cadre de vie désirable.

═══ COMMERCE ═══

"Promotion" + commerce :
→ Le produit INTACT, centré. Fond : couleur unie vive et contrastante (corail, turquoise, jaune citron). Éclairage studio avec reflet blanc sur le produit. Aucun élément autour sauf peut-être une ombre portée nette. Look e-commerce premium / pub Instagram.

"Nouveauté" + commerce :
→ Le produit INTACT. Fond : surface texturée tendance (lin froissé, bois blanchi, béton ciré). 2-3 objets déco minimalistes autour (bougie, plante, livre). Lumière naturelle de fenêtre, ombres douces. Look flat lay lifestyle Instagram.

"Ambiance" + commerce :
→ La boutique/étalage INTACT. Renforcer : éclairage chaleureux, spots sur les produits phares, reflets sur les vitrines. Tons chauds, ambiance "concept store" accueillant. L'image doit donner envie de pousser la porte.

═══ SPORT & BIEN-ÊTRE ═══

"Promotion" + sport :
→ Le sujet INTACT. Fond : salle de sport ou extérieur flou, éclairage latéral dramatique qui sculpte les muscles/la silhouette. Tons sombres (noir, gris) avec un accent de couleur vive (rouge, néon). Look affiche de coaching.

"Avant / Après" + sport :
→ Le résultat INTACT. Fond : blanc pur ou gris neutre, éclairage uniforme. Posture visible de la tête aux pieds. Netteté maximale pour montrer la transformation physique.

"Nouveauté" + sport :
→ Le sujet INTACT. Fond : extérieur tropical (plage, parc, montagne de Guadeloupe). Lumière du matin dorée, ciel bleu. Énergie positive et fraîcheur. Look "nouveau cours en plein air".

"Performance" + sport :
→ Le sujet en action INTACT. Fond : NOIR avec un seul spot latéral puissant. Particules de sueur/eau en suspension. Flou de mouvement sur les extrémités. Look Nike/Adidas — puissance brute, contraste extrême.

"Le lieu" + sport :
→ La salle/le studio INTACT. Renforcer : sol brillant reflétant la lumière, néons colorés au plafond, équipements alignés impeccablement. Lumière froide bleutée + accents néon. Look salle premium qui motive.

═══ TOURISME & HÉBERGEMENT ═══

"Promotion" + tourisme :
→ Le lieu INTACT. Fond : ciel bleu tropical intense, mer turquoise visible. Lumière de midi, couleurs saturées. Palmiers et végétation luxuriante. Look carte postale / pub d'office de tourisme.

"Nouveauté" + tourisme :
→ Le lieu INTACT. Fond : rénové et frais, couleurs vives des volets/portes, fleurs tropicales (hibiscus, bougainvillier). Lumière du matin. Look "viens découvrir ce nouveau spot".

"Ambiance" + tourisme :
→ Le lieu INTACT. Renforcer : golden hour (coucher de soleil orange/rose), hamac ou transats, boisson tropicale posée, mer calme en fond. Tons chauds dorés partout. L'image doit vendre du rêve et de la détente.

"Le lieu" + tourisme :
→ Le gîte/hôtel INTACT. Ciel remplacé par ciel bleu parfait avec quelques nuages blancs. Végétation tropicale renforcée (palmiers, cocotiers). Piscine bleu turquoise si présente. Lumière de photo immobilière de luxe — tout est net, lumineux, invitant.

═══ AUTO & MOTO ═══

"Promotion" + auto :
→ Le véhicule/la réparation INTACT. Fond : sol de garage propre et brillant (époxy gris), mur d'outils rangés, éclairage néon blanc industriel. Look "garage pro de confiance".

"Avant / Après" + auto :
→ Le résultat INTACT. Fond : blanc pur ou parking propre. Éclairage uniforme. Le véhicule/la pièce occupe 80% du cadre. Chaque détail de la réparation/carrosserie doit être visible.

"Nouveauté" + auto :
→ Le véhicule INTACT. Fond : route côtière de Guadeloupe, palmiers, ciel bleu. Reflets sur la carrosserie. Lumière latérale du soleil. Look "essai routier" magazine auto.

═══ ÉVÉNEMENTIEL ═══

"Promotion" + événementiel :
→ Le sujet INTACT (DJ, décor, prestation). Fond : scène avec lumières de concert (rose, violet, bleu). Fumée/haze léger. Silhouettes de public floues. Look affiche de soirée.

"Nouveauté" + événementiel :
→ Le sujet INTACT. Fond : lieu de réception élégant, guirlandes lumineuses, tables dressées. Lumière chaude. Look "book de prestataire mariage".

"Ambiance" + événementiel :
→ La scène/le lieu INTACT. Renforcer : lumières multicolores, bokeh (cercles lumineux flous), fumée de machine. Fond sombre percé de faisceaux lumineux. L'image doit transmettre l'énergie de la fête.

"Performance" + événementiel :
→ Le sujet en action INTACT (DJ aux platines, danseur, animateur). Fond : NOIR avec projecteurs colorés en contre-jour. Silhouettes du public bras levés. Fumée et lasers. Look photo de festival.

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

  const userPrompt = `Analyse cette photo et exécute tes 2 missions. Regarde attentivement le SUJET PRINCIPAL de la photo — c'est lui qui doit rester intact. Puis décris l'environnement idéal à générer autour.`

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

    // Ajouter le footer de compositing au prompt d'édition
    const compositingFooter = `\n\nCRITICAL RULES: Keep the MAIN SUBJECT (product, dish, work, person) exactly as it is — same shape, colors, textures, details. Do NOT alter, distort, or regenerate the subject. You may enhance the BACKGROUND and ENVIRONMENT around the subject: generate a new setting, improve lighting, add contextual elements. The subject must remain photographically real and untouched. The final image should look like a professional product photography composite.`

    return {
      editPrompt: (parsed.editPrompt || 'Using the provided image, keep the main subject intact and place it in a clean, professional environment with warm lighting.') + compositingFooter,
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
      const submitResponse = await fetch('https://queue.fal.run/fal-ai/nano-banana-pro/edit', {
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
