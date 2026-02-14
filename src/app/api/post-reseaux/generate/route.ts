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

CHAQUE COMBINAISON CI-DESSOUS DOIT PRODUIRE UNE IMAGE RADICALEMENT DIFFÉRENTE.
Le pro doit se dire "WOW" en voyant le résultat. Chaque scène doit donner envie de poster immédiatement.
ADAPTE LE DÉCOR AU NIVEAU DU PRODUIT : un plat en barquette → décor street food (pas restaurant étoilé). Un produit simple → décor accessible (pas vitrine de luxe).

═══ RESTAURANT ═══

[R1] "Plat du jour" :
→ Le plat INTACT. Créer une scène "food porn" irrésistible : le plat sur une table en bois avec des traces de sauce autour, une main floue qui tend une fourchette vers le plat, de la vapeur qui s'en échappe, des miettes de pain à côté. Lumière naturelle chaude de fenêtre. L'image doit donner FAIM instantanément. Si c'est street food : table de rue colorée, soleil des Antilles. Si c'est gastronomique : nappe, verre de vin, lumière tamisée.

[R2] "Promotion" :
→ Le plat INTACT. Le transformer en AFFICHE PUB : fond noir dramatique, le plat éclairé par un spot unique comme un bijou dans une vitrine. Couleurs du plat hyper-saturées, tout le reste sombre. Des ÉTINCELLES ou particules dorées flottent autour. L'image crie "venez manger ça MAINTENANT". Effet explosion de saveurs.

[R3] "Nouveauté" :
→ Le plat INTACT. Scène de "révélation de chef" : fond cuisine pro en inox flou, fumée/vapeur dramatique qui enveloppe le plat, éclairage en clair-obscur (moitié du plat illuminée, moitié dans l'ombre). Des ingrédients frais (herbes, épices, piment) volent/flottent autour du plat comme par magie. L'image dit "goûtez à notre nouvelle création".

[R4] "Ambiance" :
→ La table/le lieu INTACTS. Transformer en RÊVE TROPICAL : terrasse face à la mer des Caraïbes au coucher du soleil, ciel en feu orange-rose-violet, palmiers en silhouette, lampions allumés, bougies sur la table, reflets dorés partout. Toute l'image baigne dans une lumière dorée magique. On doit vouloir y être.

═══ BEAUTÉ ═══

[B1] "Promotion" :
→ Le résultat (coiffure/maquillage/ongles) INTACT. Créer un look COUVERTURE DE MAGAZINE : fond dégradé dramatique (violet profond vers rose), éclairage de studio fashion avec des reflets brillants sur les cheveux/la peau. Des PAILLETTES DORÉES flottent dans l'air. Le résultat brille littéralement. L'image dit "je veux la même chose".

[B2] "Avant / Après" :
→ Le résultat INTACT. Scène RÉVÉLATION GLAMOUR : fond rideau de velours bordeaux qui s'ouvre, le résultat au centre illuminé par un projecteur doré comme une star sur scène. Confettis dorés qui tombent. L'image dit "REGARDEZ cette transformation". Le résultat est traité comme une oeuvre d'art dévoilée.

[B3] "Nouveauté" :
→ Le résultat INTACT. Ambiance SHOOTING MODE TROPICAL : fond mur de fleurs tropicales géantes (hibiscus, orchidées, frangipaniers) roses et rouges. Lumière naturelle flatteuse. Feuilles de palmier créant des ombres graphiques. L'image ressemble à un editorial beauté dans un magazine de mode tourné aux Antilles.

[B4] "Ambiance" :
→ Le salon INTACT. Le transformer en TEMPLE DU BIEN-ÊTRE : brume légère, bougies partout, orchidées blanches, pierres chaudes, serviettes roulées. Lumière tamisée dorée filtrée à travers des voilages blancs. Reflets doux dans les miroirs. On sent presque l'huile essentielle. L'image fait ressentir la détente.

═══ ARTISAN ═══

[A1] "Promotion" :
→ La réalisation INTACTE. Mise en scène HÉROÏQUE : le travail éclairé comme un monument, avec un éclairage latéral puissant qui sculpte chaque détail et texture. Fond sombre avec juste les outils du métier rangés en silhouette. Contraste maximal. L'image dit "ce pro est un EXPERT, regardez cette maîtrise".

[A2] "Avant / Après" :
→ Le résultat INTACT. Effet RÉVÉLATION SPECTACULAIRE : un côté de l'image montre le "avant" en gris/désaturé/sombre avec des fissures et du désordre, l'autre côté montre le résultat éclairé en pleine lumière, éclatant de netteté. La différence doit sauter aux yeux. L'image dit "voilà ce que je sais faire".

[A3] "Nouveauté" :
→ La réalisation INTACTE. Placée dans un DÉCOR DE RÊVE ANTILLAIS : intérieur de maison créole lumineuse, soleil qui entre par des persiennes colorées créant des rais de lumière dramatiques, sol en carreaux de ciment, plantes tropicales. Le travail de l'artisan est le joyau de cette maison de rêve. Look magazine architecture/déco.

═══ COMMERCE ═══

[C1] "Promotion" :
→ Le produit INTACT. Effet LÉVITATION : le produit qui flotte dans les airs sur un fond de couleur vive et unie (corail, électrique ou doré selon le produit). Des RAYONS DE LUMIÈRE qui partent du produit vers les bords. Ombres portées au sol. Le produit est traité comme un objet magique et désirable. Look pub Apple/Nike.

[C2] "Nouveauté" :
→ Le produit INTACT. Scène UNBOXING DE LUXE : le produit posé sur du papier de soie froissé dans une boîte cadeau ouverte, des confettis colorés autour, ruban de satin. Lumière chaude. L'image capture l'excitation de la découverte. On veut le déballer soi-même.

[C3] "Ambiance" :
→ La boutique INTACTE. Effet VITRINE ENCHANTÉE : le produit/la boutique illuminés par une lumière chaude dorée comme une vitrine de Noël. Des petites lumières bokeh (cercles lumineux flous) partout. Les autres produits en flou artistique autour. L'image donne envie d'entrer et de toucher les produits.

═══ SPORT & BIEN-ÊTRE ═══

[S1] "Promotion" :
→ Le sujet INTACT. Look AFFICHE DE FILM D'ACTION : fond sombre orageux, le sujet éclairé par des ÉCLAIRS et lumières néon bleues et rouges. Particules de poussière/pluie illuminées. Expression intense. L'image donne envie de se dépasser. Contraste extrême, couleurs électriques.

[S2] "Avant / Après" :
→ Le résultat INTACT. Effet MÉTAMORPHOSE : un côté en noir et blanc avec une vignette sombre (le passé), l'autre côté en couleurs vives et éclatantes (le présent). Une ligne lumineuse dorée sépare les deux mondes. La transformation est dramatique et inspirante.

[S3] "Nouveauté" :
→ Le sujet INTACT. PARADIS SPORTIF TROPICAL : séance en plein air sur une plage de Guadeloupe au lever du soleil. Sable doré, mer turquoise calme, ciel pastel. Cocotiers. Le sujet baigné de lumière dorée du matin. L'image fusionne bien-être et beauté des Antilles. On veut s'inscrire immédiatement.

[S4] "Performance" :
→ Le sujet INTACT. EXPLOSION D'ÉNERGIE : fond noir absolu, le sujet éclairé par un seul faisceau blanc latéral. ÉCLABOUSSURES D'EAU en suspension tout autour, illuminées comme des diamants. Chaque goutte visible. Effet freeze-frame d'un moment de puissance pure. Look campagne Nike/Under Armour.

[S5] "Le lieu" :
→ La salle INTACTE. AMBIANCE FUTURISTE : sol miroir qui reflète tout, néons colorés (bleu, violet, rouge) au plafond et le long des murs. Légère brume au sol. Équipements qui brillent. L'image transforme une salle de sport en vaisseau spatial du fitness. On veut s'entraîner ICI.

═══ TOURISME & HÉBERGEMENT ═══

[T1] "Promotion" :
→ Le lieu INTACT. CARTE POSTALE DE RÊVE : couleurs poussées à fond (mer turquoise irréelle, ciel bleu profond, végétation vert émeraude). Tout est plus beau que la réalité. Soleil qui crée des reflets étoilés sur l'eau. Un kayak coloré ou un petit bateau de pêche au premier plan. L'image fait rêver d'évasion.

[T2] "Nouveauté" :
→ Le lieu INTACT. DÉCOUVERTE INSTAGRAM : façade aux couleurs créoles vives (jaune, bleu, rouge), bougainvilliers roses débordant des balcons, volets en bois grand ouverts. Une table de petit-déjeuner tropical dressée devant (fruits, jus frais). Lumière du matin. L'image dit "j'ai trouvé LE spot secret".

[T3] "Ambiance" :
→ Le lieu INTACT. MOMENT MAGIQUE : tout est baigné dans la lumière dorée du coucher de soleil. Un hamac, un cocktail tropical coloré avec une tranche d'ananas, la mer au fond qui reflète le ciel en feu. Des LUCIOLES ou petites lumières magiques flottent dans l'air. Le temps s'est arrêté. Pur bonheur.

[T4] "Le lieu" :
→ Le gîte/hôtel INTACT. PHOTO IMMOBILIÈRE PARFAITE : ciel bleu idéal, piscine turquoise immaculée qui reflète le ciel comme un miroir, végétation tropicale luxuriante parfaitement taillée. Tout est lumineux, net, invitant. Des serviettes roulées sur les transats, un plateau de fruits au bord de la piscine. L'image vend le séjour en 1 seconde.

═══ AUTO & MOTO ═══

[V1] "Promotion" :
→ Le véhicule/travail INTACT. SHOWROOM DE GARAGE PRO : sol miroir brillant, le véhicule/la pièce éclairé par des spots industriels. Des ÉTINCELLES de soudure ou de polissage en arrière-plan. L'image transpire le professionnalisme et la technicité. On fait confiance à ce garage.

[V2] "Avant / Après" :
→ Le résultat INTACT. TRANSFORMATION CHOC : un côté sale/abîmé/rouillé en tons gris-brun ternes, l'autre côté le résultat brillant comme neuf avec des reflets parfaits. La séparation entre les deux est nette et dramatique. L'image prouve le savoir-faire en un coup d'oeil.

[V3] "Nouveauté" :
→ Le véhicule INTACT. SHOOTING AUTO MAGAZINE : route côtière de Guadeloupe, palmiers, mer en contrebas. Le véhicule capte la lumière du soleil avec des reflets parfaits sur la carrosserie. Flou de vitesse léger sur le fond. L'image sort tout droit d'un magazine automobile.

═══ ÉVÉNEMENTIEL ═══

[E1] "Promotion" :
→ Le sujet INTACT. AFFICHE DE SOIRÉE ÉPIQUE : scène avec fumée dense qui monte du sol, projecteurs de couleurs (rose, violet, bleu) qui percent la fumée en faisceaux. Le sujet au centre comme une star sur scène. Silhouettes du public excité en contre-jour. L'image donne envie de ne pas rater cet événement.

[E2] "Nouveauté" :
→ Le sujet INTACT. CONTE DE FÉES MARIAGE : salle de réception avec des milliers de fairy lights qui descendent du plafond comme des étoiles. Tables rondes avec bouquets de fleurs luxuriants. Drapés blancs et dorés. Lumière chaude dorée partout. L'image fait rêver chaque future mariée.

[E3] "Ambiance" :
→ Le lieu INTACT. FÊTE MAGNÉTIQUE : boule disco géante qui éclabousse les murs de centaines de points lumineux. Fumée dansante traversée par des faisceaux colorés. Silhouettes de danseurs en mouvement. Dominante bleu-violet-rose. L'énergie de la fête traverse l'écran.

[E4] "Performance" :
→ Le sujet INTACT. MOMENT LÉGENDAIRE : fond noir total, le sujet illuminé par un spot blanc d'en haut comme un ange. Des LASERS multicolores partent en éventail derrière. MAINS DU PUBLIC levées en silhouette en bas. CONFETTIS dorés qui tombent. L'image capture l'instant où la salle explose.

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
