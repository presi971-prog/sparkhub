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

CHAQUE COMBINAISON CI-DESSOUS A UNE SIGNATURE VISUELLE UNIQUE. Aucune ne doit ressembler à une autre. Suis les instructions EXACTEMENT.

═══ RESTAURANT (4 styles) ═══

[R1] "Plat du jour" + restaurant :
→ Le plat INTACT. ANALYSER LA GAMME : barquette/emballage → table en bois peinte de couleurs vives (bleu, rouge, jaune créole), fond mur de food truck tagué, lumière naturelle extérieure de midi, ambiance déjeuner de rue caribéenne. Assiette dressée → nappe en tissu blanc, couverts argent, verre de vin rouge, fond salle flou avec lumière tamisée ambrée. Vue plongeante à 45°, le plat occupe 60% de l'image. SIGNATURE : serviette à carreaux madras + verre d'eau avec citron vert à côté.

[R2] "Promotion" + restaurant :
→ Le plat INTACT, centré. Fond : papier kraft froissé brun, le plat posé sur une planche à découper en bois rectangulaire. Un SEUL spot puissant en haut à droite, ombre portée nette à gauche. AUCUN autre élément. SIGNATURE : fond kraft + planche bois + ombre dure. Look menu de restaurant.

[R3] "Nouveauté" + restaurant :
→ Le plat INTACT. Fond : plan de travail en ardoise noire mate. Vapeur/fumée visible qui monte du plat. Éclairage rasant latéral gauche orange-rouge qui crée des ombres longues. 2 piments scotch bonnet + branche de thym posés sur l'ardoise. SIGNATURE : ardoise noire + fumée + éclairage rouge latéral. Look "reveal chef".

[R4] "Ambiance" + restaurant :
→ Le lieu/la table INTACTS. Terrasse avec vue mer Caraïbes floue en arrière-plan. Guirlandes de lampions allumées au-dessus. Verre de ti-punch avec tranche de citron vert. Ciel de coucher de soleil orange-rose. SIGNATURE : lampions + ti-punch + coucher de soleil mer. Tons exclusivement chauds ambrés.

═══ BEAUTÉ (4 styles) ═══

[B1] "Promotion" + beauté :
→ Le résultat (coiffure/maquillage/ongles) INTACT. Fond : couleur ROSE MILLENNIAL UNI (#F5C6D0), rien d'autre. Éclairage ring light frontal (reflet circulaire visible si portrait). Cadrage serré sur le résultat. SIGNATURE : fond rose uni + ring light. Look affiche de salon.

[B2] "Avant / Après" + beauté :
→ Le résultat INTACT. Fond : mur en BÉTON GRIS TEXTURÉ (pas blanc, pas lisse). 2 éclairages latéraux symétriques (gauche ET droite) créant un relief. Contraste fort, netteté maximale. Chaque mèche, texture, détail visible. SIGNATURE : béton gris + double éclairage latéral. Look portfolio pro.

[B3] "Nouveauté" + beauté :
→ Le résultat INTACT. Fond : mur de FEUILLES DE MONSTERA vert jungle. Sol en terrazzo rose et gris. Lumière douce de grande fenêtre en arc à droite. 1 fleur d'hibiscus rouge posée sur la surface. SIGNATURE : monstera + terrazzo + hibiscus. Look influenceuse beauté tropicale.

[B4] "Ambiance" + beauté :
→ Le salon/lieu INTACT. MIROIR ROND DORÉ accroché au mur en arrière-plan. Comptoir en marbre blanc veiné gris. 3 serviettes blanches roulées. 1 bougie allumée dans un pot en verre. Vapeur légère. Tons crème et or exclusivement. SIGNATURE : miroir doré + marbre + bougie. Look spa luxe.

═══ ARTISAN (3 styles) ═══

[A1] "Promotion" + artisan :
→ La réalisation INTACTE. Fond : mur de BRIQUES ROUGES anciennes. Outils accrochés sur panneau perforé métallique (clé à molette, niveau). Éclairage halogène jaune de chantier venant du bas. CASQUE DE CHANTIER JAUNE posé au premier plan. SIGNATURE : briques rouges + panneau outils + casque jaune. Look artisan de confiance.

[A2] "Avant / Après" + artisan :
→ Le résultat INTACT. Fond : mur blanc STRICT, sol blanc, ZÉRO décor. Éclairage 360° uniforme sans aucune ombre (comme une photo d'expertise). Cadrage DROIT, lignes parfaitement horizontales et verticales. SIGNATURE : blanc total + zéro ombre + cadrage architectural. Look photo d'expertise immobilière.

[A3] "Nouveauté" + artisan :
→ La réalisation INTACTE. Fond : intérieur de MAISON CRÉOLE rénovée. Persiennes en bois bleues entrouvertes laissant passer des rais de lumière. Sol en carreaux de ciment anciens restaurés. Plante verte en pot en terre cuite. SIGNATURE : persiennes bleues + carreaux ciment + rais de lumière. Look magazine déco Antilles.

═══ COMMERCE (3 styles) ═══

[C1] "Promotion" + commerce :
→ Le produit INTACT, centré. Fond : couleur TURQUOISE VIF UNI (#00BCD4). Le produit posé sur un PIÉDESTAL BLANC CYLINDRIQUE. 1 seul spot d'en haut, ombre portée en cercle net sous le piédestal. AUCUN autre élément. SIGNATURE : turquoise + piédestal blanc + spot unique. Look vitrine Apple Store.

[C2] "Nouveauté" + commerce :
→ Le produit INTACT. Surface : DRAP DE LIN BLANC FROISSÉ. Mur blanc. 1 branche d'eucalyptus à côté du produit. Lumière de fenêtre à droite créant des OMBRES DE STORE VÉNITIEN en bandes sur le lin. SIGNATURE : lin froissé + eucalyptus + ombres de store. Look flat lay lifestyle.

[C3] "Ambiance" + commerce :
→ La boutique/étalage INTACTS. ÉTAGÈRE EN BOIS MASSIF foncé avec d'autres produits flous autour. Spot directionnel chaud sur le produit principal. Fond boisé. 1 petite plante succulente en pot cuivré. SIGNATURE : étagère bois foncé + spot chaud + pot cuivré. Look concept store cosy.

═══ SPORT & BIEN-ÊTRE (5 styles) ═══

[S1] "Promotion" + sport :
→ Le sujet INTACT. Fond : NOIR CHARBON. Éclairage en contre-plongée à 45° venant du bas gauche, ombres dramatiques vers le haut. BANDE NÉON VERT FLUO (#39FF14) horizontale en bas de l'image. SIGNATURE : noir + éclairage bas + néon vert. Look affiche coaching premium.

[S2] "Avant / Après" + sport :
→ Le résultat INTACT. Fond : GRIS 18% PHOTOGRAPHIQUE (gris moyen neutre). 2 softbox à 45° (gauche et droite). Sujet de la tête aux pieds, contraste élevé, muscles/lignes sculptés par la lumière. SIGNATURE : gris moyen + double softbox + full body. Look transformation fitness.

[S3] "Nouveauté" + sport :
→ Le sujet INTACT. Fond : PLAGE DE SABLE DORÉ, mer turquoise, cocotiers. Lumière du matin 7h, ciel pastel rose-bleu. Tapis de yoga ou serviette de sport sur le sable. SIGNATURE : plage + ciel pastel + accessoire sport sur sable. Look cours en plein air tropical.

[S4] "Performance" + sport :
→ Le sujet en action INTACT. Fond : NOIR ABSOLU. 1 seul spot latéral BLANC puissant venant de gauche. Gouttelettes d'eau/sueur illuminées en suspension. Le reste dans le noir total. SIGNATURE : noir absolu + spot blanc latéral + gouttelettes. Look Nike "Just Do It".

[S5] "Le lieu" + sport :
→ La salle/studio INTACT. SOL ÉPOXY BRILLANT reflétant les équipements comme un miroir. BANDES LED ROUGES au ras du sol. Mur de miroirs au fond. Éclairage BLEU-BLANC froid au plafond. SIGNATURE : sol miroir + LED rouges + éclairage froid bleu. Look salle premium high-tech.

═══ TOURISME & HÉBERGEMENT (4 styles) ═══

[T1] "Promotion" + tourisme :
→ Le lieu INTACT. VUE AÉRIENNE/DRONE légèrement en plongée. Mer turquoise en fond, végétation tropicale dense autour. Couleurs ULTRA-SATURÉES (+40% saturation). Ciel bleu intense sans nuage. SIGNATURE : vue drone + saturation extrême + mer turquoise. Look brochure office de tourisme.

[T2] "Nouveauté" + tourisme :
→ Le lieu INTACT. FAÇADE COLORÉE (jaune soleil ou bleu créole). Bougainvilliers en fleur rose vif grimpant sur la façade. Volets en bois ouverts. SCOOTER VINTAGE garé devant. Lumière de 10h du matin. SIGNATURE : façade colorée + bougainvilliers + scooter. Look "nouveau spot à découvrir".

[T3] "Ambiance" + tourisme :
→ Le lieu INTACT. HAMAC entre deux cocotiers au premier plan. Mer calme en fond. Ciel de coucher de soleil ORANGE-ROSE-VIOLET dégradé. LAMPE TEMPÊTE allumée posée sur table basse en bois. Verre de planteur avec paille. SIGNATURE : hamac + coucher de soleil + lampe tempête. Look paradis tropical rêvé.

[T4] "Le lieu" + tourisme :
→ Le gîte/hôtel INTACT. Ciel remplacé par BLEU PARFAIT avec exactement 3 nuages blancs. PISCINE turquoise au premier plan avec surface lisse comme un miroir. Chaises longues blanches alignées. Bougainvilliers roses sur un côté. Lumière de "magic hour" (juste après lever du soleil). SIGNATURE : piscine miroir + 3 nuages + chaises blanches. Look photo immobilière de luxe.

═══ AUTO & MOTO (3 styles) ═══

[V1] "Promotion" + auto :
→ Le véhicule/la réparation INTACT. SOL ÉPOXY GRIS BRILLANT de garage. MUR avec PANNEAU PERFORÉ et outils FACOM rangés. NÉONS BLANCS INDUSTRIELS au plafond. Pont élévateur rouge visible en fond flou. SIGNATURE : époxy gris + panneau Facom + néons industriels. Look garage pro certifié.

[V2] "Avant / Après" + auto :
→ Le résultat INTACT. PARKING ASPHALTE propre avec MARQUAGE AU SOL BLANC visible. Ciel COUVERT gris uniforme (lumière diffuse sans ombre). Cadrage 3/4 avant. 80% du cadre = le véhicule. SIGNATURE : asphalte + marquage blanc + ciel couvert. Look expertise carrosserie.

[V3] "Nouveauté" + auto :
→ Le véhicule INTACT. ROUTE CÔTIÈRE de Guadeloupe avec muret en pierre. PALMIERS ROYAUX des deux côtés. Ciel bleu. Soleil à gauche créant des REFLETS sur la carrosserie et le pare-brise. SIGNATURE : route côtière + palmiers royaux + reflets carrosserie. Look essai routier magazine.

═══ ÉVÉNEMENTIEL (4 styles) ═══

[E1] "Promotion" + événementiel :
→ Le sujet INTACT. RIDEAU NOIR en fond. 3 PROJECTEURS PAR en contre-jour (rose, violet, bleu). FUMÉE de machine à brouillard dense au sol. Sol noir reflétant les lumières. SIGNATURE : rideau noir + 3 projecteurs colorés + fumée au sol. Look affiche de soirée.

[E2] "Nouveauté" + événementiel :
→ Le sujet INTACT. Salle de réception avec PLAFOND DRAPÉ BLANC. GUIRLANDES DE FAIRY LIGHTS descendant du plafond. Tables rondes avec CENTRES DE TABLE FLORAUX (roses et verdure). Lumière dorée chaude. SIGNATURE : drapé blanc + fairy lights + centres floraux. Look prestataire mariage.

[E3] "Ambiance" + événementiel :
→ La scène/le lieu INTACT. BOULE DISCO créant des POINTS LUMINEUX sur les murs et le sol. Éclairage dominant BLEU-VIOLET. Silhouettes floues de 4-5 danseurs en fond. Légère fumée. SIGNATURE : boule disco + points lumineux + silhouettes + bleu-violet. Look soirée dansante.

[E4] "Performance" + événementiel :
→ Le sujet en action INTACT. Fond : NOIR TOTAL. Spot blanc unique d'en haut sur le sujet. LASERS VERTS ET ROUGES partant de derrière le sujet en éventail. MAINS DU PUBLIC en silhouette noire en bas de l'image. SIGNATURE : noir + lasers + mains du public. Look photo de festival.

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
