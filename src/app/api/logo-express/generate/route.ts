import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const KIE_API_KEY = process.env.KIE_API_KEY!
const FAL_KEY = process.env.FAL_KEY!
const CREDITS_COST = 5

interface GeminiLogoResult {
  logos: Array<{
    approach: string
    prompt: string
  }>
  palette: string[]
  fonts: string[]
}

// ═══════════════════════════════════════════════════════════════
// VOCABULAIRE VISUEL PAR ACTIVITÉ
// Chaque métier a ses symboles forts, ses motifs identitaires,
// ses formes archétypales que les clients reconnaissent instinctivement
// ═══════════════════════════════════════════════════════════════

const VISUAL_VOCABULARY: Record<string, {
  label: string
  symbols: string
  motifs: string
  shapes: string
  mood: string
  avoid: string
  fonts_hint: string
}> = {
  restaurant: {
    label: 'Restaurant / Snack / Food truck',
    symbols: 'chef hat, fork and knife crossed, steaming plate, cooking pot, flame, spoon, cutting board, mortar and pestle, herb sprig, chili pepper',
    motifs: 'steam wisps, circular plate forms, organic food shapes, spice patterns, leaf garnishes',
    shapes: 'circular emblems, shield crests, banner ribbons, oval frames',
    mood: 'warm, appetizing, welcoming, generous, savory',
    avoid: 'generic clipart fork/knife, overly complex food illustrations, realistic food photos',
    fonts_hint: 'rounded warm fonts like Nunito, Quicksand for casual — serif like Playfair Display, Cormorant for upscale',
  },
  artisan: {
    label: 'Artisan / BTP / Rénovation',
    symbols: 'hammer, wrench, house silhouette, roof line, brick pattern, level tool, paintbrush, cogwheel, measuring tape, hard hat',
    motifs: 'geometric construction lines, blueprint grid, angular precision marks, strong diagonals',
    shapes: 'hexagons (strength), squares (stability), angular shields, bold block letters',
    mood: 'solid, trustworthy, precise, strong, reliable, built-to-last',
    avoid: 'weak thin lines, overly decorative elements, fragile-looking designs',
    fonts_hint: 'strong industrial fonts like Oswald, Bebas Neue, Archivo Black — geometric sans like Montserrat Bold',
  },
  beaute: {
    label: 'Salon de beauté / Coiffure / Esthétique',
    symbols: 'scissors (stylized), hair strand flowing, mirror, lipstick, eyelash, flower (rose, lotus, orchid), butterfly, diamond, crown',
    motifs: 'flowing hair curves, petal arrangements, soft swirls, delicate line art, watercolor splashes',
    shapes: 'circular monograms, organic flowing forms, elegant S-curves, feminine arches',
    mood: 'elegant, feminine, luxurious, transformative, confident, radiant',
    avoid: 'childish cartoon faces, overly busy floral patterns, generic gender symbols',
    fonts_hint: 'elegant scripts like Great Vibes, Cormorant — modern sans like Poppins Light, Josefin Sans',
  },
  commerce: {
    label: 'Commerce / Boutique / Magasin',
    symbols: 'shopping bag, storefront awning, price tag, gift box, star, crown, hanger, barcode element, basket',
    motifs: 'clean geometric grids, stacked elements, window display frames, bold typographic marks',
    shapes: 'squares and rectangles (shelves/boxes), rounded badges, bold stamps, clean monograms',
    mood: 'accessible, trendy, trustworthy, curated, premium yet approachable',
    avoid: 'dollar signs, overly corporate logos, generic cart icons',
    fonts_hint: 'versatile sans like Inter, DM Sans — display fonts like Space Grotesk, Outfit for personality',
  },
  sport: {
    label: 'Sport / Bien-être / Coach / Salle de sport',
    symbols: 'dumbbell, lightning bolt, mountain peak, running figure silhouette, flame, shield, fist, wings, heartbeat line, lotus for wellness',
    motifs: 'speed lines, dynamic angles, swooshes, power gradients, motion trails',
    shapes: 'sharp angular forms, dynamic swooshes, pointed shields, aggressive angles, chevrons',
    mood: 'powerful, energetic, motivating, dynamic, unstoppable, transformative',
    avoid: 'static poses, weak thin designs, overly zen when it should be powerful (and vice versa)',
    fonts_hint: 'bold impactful fonts like Anton, Russo One, Teko — or zen fonts like Cormorant for wellness',
  },
  tourisme: {
    label: 'Tourisme / Hébergement / Hôtel / Gîte / Excursions',
    symbols: 'palm tree, wave, sun, compass rose, hammock, boat/catamaran, hibiscus flower, hummingbird (colibri), starfish, seashell, mountain (Soufrière)',
    motifs: 'wave patterns, tropical leaf outlines, sunset gradients, horizon lines, ocean circles',
    shapes: 'circular sun emblems, organic flowing forms, badge with landscape silhouette, crescent moon shapes',
    mood: 'paradise, relaxing, exotic, unforgettable, dreamy, authentic Caribbean',
    avoid: 'generic globe icons, airplane silhouettes, overly corporate travel branding',
    fonts_hint: 'relaxed fonts like Comfortaa, Quicksand — elegant like Cormorant for luxury — display like Pacifico for casual',
  },
  auto: {
    label: 'Auto / Moto / Garage / Mécanicien / Carrossier',
    symbols: 'wrench crossed, gear/cogwheel, piston, steering wheel, speedometer, spark plug, tire, checkered flag, engine silhouette',
    motifs: 'chrome reflections, speed lines, grease textures, mechanical precision, racing stripes',
    shapes: 'circular gear forms, sharp angular badges, diamond shapes, strong horizontal lines, shield crests',
    mood: 'powerful, mechanical, fast, precise, professional, heavy-duty',
    avoid: 'cute/cartoon cars, overly feminine elements, weak pastel colors',
    fonts_hint: 'bold condensed fonts like Bebas Neue, Oswald, Barlow Condensed — racing fonts like Rajdhani, Teko',
  },
  evenementiel: {
    label: 'Événementiel / DJ / Photographe / Animateur / Décorateur',
    symbols: 'spotlight, music note, camera lens, confetti burst, star, microphone, turntable, disco ball, curtain drape, champagne glass',
    motifs: 'light beams, bokeh dots, confetti scatter, sound waves, film strip elements, sparkle effects',
    shapes: 'dynamic starburst forms, circular lens shapes, angular stage designs, bold asymmetric compositions',
    mood: 'festive, electric, unforgettable, spectacular, glamorous, high-energy',
    avoid: 'childish party hats, generic balloons, clip-art style elements',
    fonts_hint: 'display fonts like Righteous, Bungee, Audiowide — elegant like Cinzel for luxury events — script like Sacramento for weddings',
  },
}

// ═══════════════════════════════════════════════════════════════
// DIRECTIVES DE STYLE
// Chaque style a ses règles de composition, ses formes,
// ses techniques visuelles et ses interdits
// ═══════════════════════════════════════════════════════════════

const STYLE_DIRECTIVES: Record<string, {
  label: string
  composition: string
  techniques: string
  colorRules: string
  avoid: string
  exampleBrands: string
}> = {
  moderne: {
    label: 'Moderne — Minimaliste, Contemporain',
    composition: 'Extreme simplicity. Maximum 2-3 visual elements. Generous negative space. Perfect geometric alignment. Grid-based layout. Think Apple, Airbnb, Stripe logos.',
    techniques: 'Flat design, no gradients unless very subtle, geometric shapes, mathematical precision, mono-weight line art, optical balance. Use the golden ratio for proportions.',
    colorRules: 'Maximum 2 colors plus white. High contrast. One bold primary + one accent or black. Flat solid colors, no textures.',
    avoid: 'Ornamental details, bevels, shadows, 3D effects, texture fills, decorative borders, busy backgrounds, gradients',
    exampleBrands: 'Apple, Nike, Airbnb, Spotify, Medium — clean, iconic, timeless',
  },
  vintage: {
    label: 'Vintage — Rétro, Badge, Classique',
    composition: 'Badge or emblem format. Circular or shield shape with inner/outer borders. Text follows curved paths around the emblem. Central illustration surrounded by decorative frames. Think old brewery labels, barber shop signs, artisanal stamps.',
    techniques: 'Engraved illustration style, crosshatch shading, ribbon banners, stars as separators, established year "EST. 2024", ornamental borders, aged/distressed texture hints, letterpress feel, hand-drawn quality',
    colorRules: '2-3 muted/aged colors. Cream/off-white background tones. Deep browns, navy, burgundy, forest green, gold/brass accents. No neon, no bright modern colors.',
    avoid: 'Flat modern minimalism, gradient fills, sans-serif fonts alone, sharp digital perfection',
    exampleBrands: 'Jack Daniel\'s, Brooklyn Brewery, Patagonia vintage line — timeless, authentic, craft quality',
  },
  tropical: {
    label: 'Tropical — Caraïbe, Vivant, Nature',
    composition: 'Organic flowing forms. Asymmetric balance. Natural shapes integrated with typography. Elements from Caribbean nature woven into the design. Leaf framing. Think island resort branding, rum labels, surf brands.',
    techniques: 'Bold flat colors with organic shapes, hand-drawn botanical elements, watercolor wash hints, leaf/flower integration into letterforms, wave motifs as underlines, sunset gradient accents, layered tropical silhouettes',
    colorRules: 'Vibrant saturated palette. Turquoise ocean blues, mango/papaya oranges, palm greens, hibiscus pinks/reds, sunset golds. White for contrast. Caribbean color energy.',
    avoid: 'Dull muted tones, corporate stiffness, overly symmetrical compositions, clip-art palm trees',
    exampleBrands: 'Havaianas, Tommy Bahama, Plantation rum, Caribbean Airlines — vibrant, authentic, joyful',
  },
  luxe: {
    label: 'Luxe — Élégant, Premium, Raffiné',
    composition: 'Symmetrical, centered, balanced. Refined spacing. Monogram or crest format. Minimal elements, maximum sophistication. Think Chanel, Hermès, luxury hotel branding.',
    techniques: 'Thin elegant line art, serif typography, gold/metallic accents, subtle foil stamp effect, ornamental filigree details, crown or laurel wreath elements, embossed look, monogram interlock',
    colorRules: 'Black and gold as primary duo. Deep navy + gold. Burgundy + gold. White + gold. Maximum 2 colors. Metallic gold hex #D4AF37 or #C9A84C. Rich dark backgrounds.',
    avoid: 'Bright colors, playful fonts, casual elements, thick heavy lines, busy compositions',
    exampleBrands: 'Chanel, Rolex, Four Seasons, Cartier — timeless luxury, understated elegance, whispered quality',
  },
  fun: {
    label: 'Fun — Coloré, Dynamique, Décalé',
    composition: 'Playful asymmetry. Tilted angles (5-15°). Overlapping elements. Rounded corners everywhere. Unexpected combinations. Think Google, Mailchimp, Slack.',
    techniques: 'Bold rounded shapes, thick outlines, 3D shadow offsets (solid color not gradient), speech bubble elements, exclamation marks, smiley/wink integration, bouncy letter spacing, sticker-like design, hand-drawn wobbly lines',
    colorRules: 'Multicolor palette (3-5 bold colors). High saturation. Contrasting complementary pairs. Yellow + purple, orange + blue, pink + green. Black outlines to unify. Pop art energy.',
    avoid: 'Serious corporate feel, thin delicate lines, muted colors, symmetrical rigidity, formal compositions',
    exampleBrands: 'Slack, Mailchimp, Figma, Discord — approachable, memorable, personality-driven',
  },
  surprise: {
    label: 'Surprise — L\'IA choisit le meilleur style',
    composition: 'Choose the BEST style for this specific business type, name, and description. Mix elements from different styles if it serves the brand. Be BOLD and CREATIVE. Make something the client would never have imagined but that feels PERFECT for their business.',
    techniques: 'Use whatever techniques produce the most striking, memorable result. Combine unexpected approaches. Push creative boundaries while maintaining professionalism.',
    colorRules: 'Choose the most impactful palette for this specific business. Not generic — specifically crafted for their industry, name, and description.',
    avoid: 'Generic, forgettable, template-looking designs. The whole point is to SURPRISE with quality.',
    exampleBrands: 'Think award-winning brand identity agencies like Pentagram, Wolff Olins — unexpected, bold, makes you stop scrolling',
  },
}

// ═══════════════════════════════════════════════════════════════
// ANTI-PATTERNS : ce qui ruine les logos IA
// ═══════════════════════════════════════════════════════════════

const LOGO_ANTI_PATTERNS = `CRITICAL ANTI-PATTERNS — Things that RUIN AI-generated logos:
1. NEVER generate photorealistic imagery. Logos must look like VECTOR ILLUSTRATIONS, not photos.
2. NEVER include mockup context (business cards, storefronts, t-shirts, phone screens).
3. NEVER include shadows or 3D perspective unless it's a deliberate flat shadow offset.
4. NEVER include gradients unless specifically requested — flat colors reproduce better at all sizes.
5. NEVER include more than 3-4 colors total (excluding white background).
6. NEVER generate text that the AI might misspell — for "typographique" and "combine" approaches, instruct exact spelling.
7. ALWAYS specify "solid pure white #FFFFFF background" — not off-white, not gray, not patterned.
8. ALWAYS specify "centered composition" — the logo must sit dead-center with breathing room.
9. ALWAYS specify "scalable vector style" — must look good from favicon to billboard.
10. ALWAYS specify "single standalone logo mark" — not multiple variations or options in one image.`

async function generateLogoPrompts(
  businessType: string,
  businessName: string,
  slogan: string,
  description: string,
  logoStyle: string,
  paletteColors: string[],
): Promise<GeminiLogoResult> {
  const vocab = VISUAL_VOCABULARY[businessType] || VISUAL_VOCABULARY.commerce
  const style = STYLE_DIRECTIVES[logoStyle] || STYLE_DIRECTIVES.moderne

  const paletteHint = paletteColors.length > 0
    ? `Le client a choisi cette palette : ${paletteColors.join(', ')}. UTILISE ces couleurs concrètes dans chaque prompt (ex: "in ${paletteColors[0]} and ${paletteColors[1]}" ).`
    : `Choisis une palette de 5 couleurs hex SPÉCIFIQUE à cette activité + ce style. Pas de palette générique.`

  const systemPrompt = `Tu es un DIRECTEUR ARTISTIQUE senior en identité de marque, spécialisé dans la création de logos pour petits commerces des Antilles françaises (Guadeloupe, Martinique). Tu as 15 ans d'expérience chez Pentagram et tu crées maintenant des identités visuelles accessibles mais de qualité agence pour des entrepreneurs locaux.

═══ LE CLIENT ═══
- Activité : ${vocab.label}
- Nom : "${businessName}"
- Slogan : "${slogan || 'aucun'}"
- Description : "${description || 'pas de description fournie'}"
- Style demandé : ${style.label}

═══ VOCABULAIRE VISUEL DE CE MÉTIER ═══
Symboles pertinents : ${vocab.symbols}
Motifs caractéristiques : ${vocab.motifs}
Formes archétypales : ${vocab.shapes}
Ambiance recherchée : ${vocab.mood}
À ÉVITER pour ce métier : ${vocab.avoid}
Typographies adaptées : ${vocab.fonts_hint}

═══ DIRECTIVES DU STYLE "${logoStyle.toUpperCase()}" ═══
Composition : ${style.composition}
Techniques : ${style.techniques}
Règles couleurs : ${style.colorRules}
À ÉVITER pour ce style : ${style.avoid}
Marques de référence : ${style.exampleBrands}

═══ COULEURS ═══
${paletteHint}

═══ ${LOGO_ANTI_PATTERNS} ═══

═══ TA MISSION ═══

Génère un JSON avec 3 éléments :

1. **4 PROMPTS** en anglais (80-120 mots chacun) pour fal.ai flux/dev. Chaque prompt produit un LOGO PROFESSIONNEL. Les 4 doivent être RADICALEMENT DIFFÉRENTS entre eux :

   a) "symbolique" — ICÔNE PURE, zéro texte
   → Crée un symbole UNIQUE qui fusionne un élément de l'activité avec une forme mémorable.
   → Pas un symbole générique (pas juste des couverts pour un restaurant) — une IDÉE créative.
   → Ex: pour un restaurant créole, fusionner une marmite avec la silhouette de la Guadeloupe.
   → Le prompt DOIT contenir : "icon only, absolutely no text, no letters, no words"

   b) "typographique" — LE NOM EST LE LOGO
   → Le texte "${businessName}" EST l'identité visuelle. Lettres transformées, stylisées, uniques.
   → Une ou plusieurs lettres intègrent un élément visuel du métier (ex: le O devient une assiette).
   → Le prompt DOIT contenir : the exact text "${businessName}" et "typographic logo, lettering design"

   c) "combine" — ICÔNE + NOM INTÉGRÉS
   → L'icône et le texte "${businessName}" forment UN TOUT harmonieux (pas juste collés côte à côte).
   → L'icône peut être au-dessus, intégrée dans une lettre, ou encadrant le texte.
   → Le prompt DOIT contenir : the text "${businessName}" et "combined mark logo"

   d) "creatif" — APPROCHE INATTENDUE
   → Ose quelque chose que le client n'aurait JAMAIS imaginé mais qui est PARFAIT pour son activité.
   → Techniques inattendues : espace négatif, double sens visuel, illusion d'optique, lettre cachée, forme ambiguë.
   → Pense aux meilleurs logos du monde : FedEx (flèche cachée), Carrefour (C caché), Amazon (sourire A→Z).

CHAQUE PROMPT doit :
- Commencer par "Professional logo design,"
- Inclure les couleurs précises (hex ou noms de couleur)
- Finir par "solid pure white #FFFFFF background, clean scalable vector illustration style, centered composition, single logo mark, no mockup, no shadow, no 3D, no photography"
- Être SPÉCIFIQUE à ce commerce précis (pas réutilisable pour un autre)
- Décrire la COMPOSITION précise (que voit-on, où, comment c'est arrangé)

2. **PALETTE** : 5 couleurs hex. Couleur 1 = primaire dominante. Couleur 2 = secondaire. Couleur 3 = accent. Couleur 4 = foncé (texte/contraste). Couleur 5 = clair (fond/espace).

3. **FONTS** : 2-3 polices Google Fonts. Police 1 = titres/logo. Police 2 = corps de texte. Police 3 (optionnelle) = accent/slogan.

IMPORTANT : Réponds UNIQUEMENT au format JSON suivant, sans markdown, sans backticks, sans texte avant ou après :
{"logos":[{"approach":"symbolique","prompt":"..."},{"approach":"typographique","prompt":"..."},{"approach":"combine","prompt":"..."},{"approach":"creatif","prompt":"..."}],"palette":["#hex1","#hex2","#hex3","#hex4","#hex5"],"fonts":["Font1","Font2","Font3"]}`

  try {
    const response = await fetch('https://api.kie.ai/gemini-3/v1/chat/completions', {
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
              text: `Crée l'identité visuelle pour "${businessName}" (${vocab.label}).
Le client veut un style ${logoStyle}. ${description ? `Il décrit son activité ainsi : "${description}".` : ''}
${slogan ? `Son slogan est : "${slogan}".` : ''}
Sois PRÉCIS, CRÉATIF et SPÉCIFIQUE à CE commerce. Chaque prompt doit être unique et non interchangeable avec un autre commerce.`,
            }],
          },
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
    return JSON.parse(cleanContent) as GeminiLogoResult
  } catch (error) {
    console.error('Gemini logo error:', error)

    // Fallback : prompts artisanaux par activité × style (pas génériques)
    const colors = paletteColors.length > 0 ? paletteColors : getFallbackPalette(businessType, logoStyle)
    const c1 = colors[0], c2 = colors[1] || colors[0], c3 = colors[2] || colors[0]
    const tail = 'solid pure white #FFFFFF background, clean scalable vector illustration style, centered composition, single logo mark, no mockup, no shadow, no 3D, no photography'
    const styleToken = getStyleToken(logoStyle)
    const symbolToken = getSymbolToken(businessType)

    return {
      logos: [
        {
          approach: 'symbolique',
          prompt: `Professional logo design, ${styleToken}, a creative iconic symbol combining ${symbolToken} into one unified mark, using ${c1} and ${c2} colors, icon only, absolutely no text no letters no words, bold distinctive silhouette that works at any size, ${tail}`,
        },
        {
          approach: 'typographique',
          prompt: `Professional logo design, ${styleToken}, the exact text "${businessName}" as a stylized typographic logo where one letter creatively incorporates ${symbolToken.split(',')[0].trim()}, custom lettering design in ${c1} with ${c3} accent, ${tail}`,
        },
        {
          approach: 'combine',
          prompt: `Professional logo design, ${styleToken}, the text "${businessName}" with a distinctive ${symbolToken.split(',')[0].trim()} icon above, combined mark logo, harmonious composition in ${c1} and ${c2}, professional brand identity, ${tail}`,
        },
        {
          approach: 'creatif',
          prompt: `Professional logo design, creative negative space concept, the silhouette of ${symbolToken.split(',')[0].trim()} cleverly hidden within the letterforms of "${businessName}", ${styleToken}, using ${c1} ${c2} ${c3}, optical illusion effect, ${tail}`,
        },
      ],
      palette: colors,
      fonts: getFallbackFonts(businessType, logoStyle),
    }
  }
}

function getStyleToken(style: string): string {
  const tokens: Record<string, string> = {
    moderne: 'modern minimalist flat design, geometric precision, clean lines, contemporary',
    vintage: 'vintage retro badge emblem style, engraved illustration, ornamental border, established craft quality',
    tropical: 'tropical Caribbean style, vibrant organic shapes, botanical elements, island energy',
    luxe: 'luxury elegant premium style, thin refined lines, gold metallic accents, sophisticated',
    fun: 'playful colorful bold style, rounded shapes, thick outlines, bouncy energetic personality',
    surprise: 'bold creative award-winning style, unexpected concept, memorable distinctive',
  }
  return tokens[style] || tokens.moderne
}

function getSymbolToken(type: string): string {
  const tokens: Record<string, string> = {
    restaurant: 'a chef hat shape and a steaming plate, culinary warmth',
    artisan: 'a house roofline and crossed tools, construction strength',
    beaute: 'flowing hair curves and a stylized flower, beauty elegance',
    commerce: 'a storefront awning shape and a gift tag, retail charm',
    sport: 'a lightning bolt and mountain peak, athletic power',
    tourisme: 'a palm tree and ocean wave, tropical paradise',
    auto: 'a gear cogwheel and speed lines, mechanical precision',
    evenementiel: 'a spotlight beam and music note, spectacular energy',
  }
  return tokens[type] || tokens.commerce
}

function getFallbackPalette(type: string, style: string): string[] {
  // Palettes spécifiques par activité × style (pas de bleu générique)
  const palettes: Record<string, Record<string, string[]>> = {
    restaurant: {
      moderne: ['#E63946', '#1D3557', '#F1FAEE', '#457B9D', '#A8DADC'],
      vintage: ['#6B4226', '#D4A373', '#FEFAE0', '#DDA15E', '#BC6C25'],
      tropical: ['#FF6B35', '#004E64', '#F0F3BD', '#25A18E', '#7AE582'],
      luxe: ['#1A1A2E', '#D4AF37', '#F5F5DC', '#16213E', '#C9A84C'],
      fun: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#2C3E50', '#FF8A5C'],
      surprise: ['#E63946', '#457B9D', '#F1FAEE', '#1D3557', '#A8DADC'],
    },
    beaute: {
      moderne: ['#C77DFF', '#240046', '#F8F0FC', '#7B2D8E', '#E0AAFF'],
      vintage: ['#8E5572', '#D4A5A5', '#FFF8F0', '#B07D62', '#F4E1D2'],
      tropical: ['#FF69B4', '#00CED1', '#FFF0F5', '#FF1493', '#20B2AA'],
      luxe: ['#1A1A2E', '#D4AF37', '#FDF8F0', '#8B7355', '#C9A84C'],
      fun: ['#FF69B4', '#BE7CFF', '#FFD700', '#FF1493', '#87CEEB'],
      surprise: ['#C77DFF', '#FF69B4', '#F8F0FC', '#240046', '#FFD700'],
    },
    artisan: {
      moderne: ['#2B2D42', '#EF233C', '#EDF2F4', '#8D99AE', '#D90429'],
      vintage: ['#5C4033', '#C19A6B', '#F5F0E8', '#8B6914', '#3E2723'],
      tropical: ['#2D6A4F', '#FFD166', '#F0F3BD', '#40916C', '#F77F00'],
      luxe: ['#1B1B1B', '#D4AF37', '#F5F0E8', '#333333', '#B8860B'],
      fun: ['#FF6B35', '#3DDC84', '#FFF275', '#1B4332', '#00B4D8'],
      surprise: ['#2B2D42', '#EF233C', '#EDF2F4', '#5C4033', '#D4AF37'],
    },
    sport: {
      moderne: ['#FF2D55', '#1C1C1E', '#F5F5F7', '#0A84FF', '#30D158'],
      vintage: ['#8B0000', '#1C2541', '#F5F0E8', '#C19A6B', '#3A506B'],
      tropical: ['#00B4D8', '#FF6B35', '#F0F3BD', '#023E8A', '#FFD166'],
      luxe: ['#1A1A2E', '#D4AF37', '#F5F5F5', '#0F0F0F', '#C9A84C'],
      fun: ['#FF2D55', '#5856D6', '#FFD60A', '#34C759', '#FF9500'],
      surprise: ['#FF2D55', '#0A84FF', '#F5F5F7', '#1C1C1E', '#30D158'],
    },
    tourisme: {
      moderne: ['#0077B6', '#00B4D8', '#F8FDFF', '#023E8A', '#90E0EF'],
      vintage: ['#4A6741', '#C19A6B', '#FFF8F0', '#8B6914', '#2D4A22'],
      tropical: ['#00B4D8', '#FF6B35', '#F0F3BD', '#009688', '#FFD166'],
      luxe: ['#1A3A4A', '#D4AF37', '#F5F0E8', '#0D2B3E', '#C9A84C'],
      fun: ['#00CED1', '#FF6B6B', '#FFE66D', '#1E90FF', '#FF69B4'],
      surprise: ['#0077B6', '#FF6B35', '#F8FDFF', '#023E8A', '#FFD166'],
    },
    commerce: {
      moderne: ['#6C63FF', '#2D2B55', '#F8F8FF', '#3F3D56', '#A5A1FF'],
      vintage: ['#5C4033', '#B07D62', '#FFF8F0', '#8B6914', '#D4A373'],
      tropical: ['#FF6B35', '#00B4D8', '#F0F3BD', '#2D6A4F', '#FFD166'],
      luxe: ['#1A1A2E', '#D4AF37', '#FFFEF7', '#16213E', '#C9A84C'],
      fun: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#6C63FF', '#FF9FF3'],
      surprise: ['#6C63FF', '#FF6B6B', '#F8F8FF', '#2D2B55', '#FFD166'],
    },
    auto: {
      moderne: ['#DC2626', '#18181B', '#F4F4F5', '#71717A', '#EF4444'],
      vintage: ['#1C2541', '#C19A6B', '#F5F0E8', '#5C4033', '#8B0000'],
      tropical: ['#FF6B35', '#006D77', '#F0F3BD', '#83C5BE', '#FFD166'],
      luxe: ['#0F0F0F', '#D4AF37', '#F5F5F5', '#1A1A1A', '#C41E3A'],
      fun: ['#FF2D55', '#FFD60A', '#00D2FF', '#1C1C1E', '#FF9500'],
      surprise: ['#DC2626', '#18181B', '#F4F4F5', '#D4AF37', '#0077B6'],
    },
    evenementiel: {
      moderne: ['#7C3AED', '#EC4899', '#FAF5FF', '#1E1B4B', '#F472B6'],
      vintage: ['#8B0000', '#D4AF37', '#FFF8F0', '#1C2541', '#C19A6B'],
      tropical: ['#FF6B35', '#00CED1', '#F0F3BD', '#FF1493', '#FFD166'],
      luxe: ['#1A1A2E', '#D4AF37', '#FDF8F0', '#0F0F0F', '#C9A84C'],
      fun: ['#FF006E', '#8338EC', '#FFBE0B', '#3A86FF', '#FB5607'],
      surprise: ['#7C3AED', '#FF006E', '#FAF5FF', '#1E1B4B', '#FFBE0B'],
    },
  }
  return palettes[type]?.[style] || palettes.commerce?.moderne || ['#2563EB', '#1E40AF', '#F8FAFC', '#1E293B', '#60A5FA']
}

function getFallbackFonts(type: string, style: string): string[] {
  const fonts: Record<string, Record<string, string[]>> = {
    restaurant: {
      moderne: ['Poppins', 'Inter', 'DM Sans'],
      vintage: ['Playfair Display', 'Cormorant', 'Lora'],
      tropical: ['Quicksand', 'Nunito', 'Pacifico'],
      luxe: ['Cormorant Garamond', 'Playfair Display', 'Lora'],
      fun: ['Fredoka', 'Quicksand', 'Nunito'],
      surprise: ['Space Grotesk', 'Playfair Display', 'DM Sans'],
    },
    beaute: {
      moderne: ['Josefin Sans', 'Poppins', 'Inter'],
      vintage: ['Cormorant', 'Great Vibes', 'Lora'],
      tropical: ['Comfortaa', 'Quicksand', 'Pacifico'],
      luxe: ['Cormorant Garamond', 'Great Vibes', 'Josefin Sans'],
      fun: ['Quicksand', 'Sacramento', 'Nunito'],
      surprise: ['Josefin Sans', 'Cormorant', 'DM Sans'],
    },
    artisan: {
      moderne: ['Montserrat', 'Inter', 'Archivo'],
      vintage: ['Oswald', 'Lora', 'Bebas Neue'],
      tropical: ['Nunito', 'Quicksand', 'Outfit'],
      luxe: ['Playfair Display', 'Montserrat', 'Cormorant'],
      fun: ['Outfit', 'Fredoka', 'Space Grotesk'],
      surprise: ['Archivo Black', 'Inter', 'Space Grotesk'],
    },
    sport: {
      moderne: ['Teko', 'Inter', 'Montserrat'],
      vintage: ['Oswald', 'Bebas Neue', 'Lora'],
      tropical: ['Quicksand', 'Teko', 'Nunito'],
      luxe: ['Cinzel', 'Montserrat', 'Cormorant'],
      fun: ['Bungee', 'Russo One', 'Quicksand'],
      surprise: ['Anton', 'Inter', 'Teko'],
    },
    tourisme: {
      moderne: ['Comfortaa', 'DM Sans', 'Inter'],
      vintage: ['Playfair Display', 'Lora', 'Cormorant'],
      tropical: ['Pacifico', 'Quicksand', 'Comfortaa'],
      luxe: ['Cormorant Garamond', 'Josefin Sans', 'Lora'],
      fun: ['Fredoka', 'Quicksand', 'Nunito'],
      surprise: ['Space Grotesk', 'Pacifico', 'DM Sans'],
    },
    commerce: {
      moderne: ['Inter', 'DM Sans', 'Outfit'],
      vintage: ['Lora', 'Playfair Display', 'Oswald'],
      tropical: ['Quicksand', 'Nunito', 'Comfortaa'],
      luxe: ['Cormorant Garamond', 'Josefin Sans', 'Montserrat'],
      fun: ['Fredoka', 'Space Grotesk', 'Quicksand'],
      surprise: ['Outfit', 'Playfair Display', 'Inter'],
    },
    auto: {
      moderne: ['Rajdhani', 'Inter', 'Barlow Condensed'],
      vintage: ['Bebas Neue', 'Oswald', 'Lora'],
      tropical: ['Teko', 'Quicksand', 'Nunito'],
      luxe: ['Cinzel', 'Montserrat', 'Cormorant'],
      fun: ['Bungee', 'Russo One', 'Teko'],
      surprise: ['Teko', 'Barlow Condensed', 'Inter'],
    },
    evenementiel: {
      moderne: ['Audiowide', 'Inter', 'Montserrat'],
      vintage: ['Cinzel', 'Playfair Display', 'Lora'],
      tropical: ['Pacifico', 'Quicksand', 'Comfortaa'],
      luxe: ['Cinzel', 'Cormorant Garamond', 'Great Vibes'],
      fun: ['Bungee', 'Righteous', 'Fredoka'],
      surprise: ['Righteous', 'Space Grotesk', 'Audiowide'],
    },
  }
  return fonts[type]?.[style] || fonts.commerce?.moderne || ['Poppins', 'Inter', 'Montserrat']
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { businessType, businessName, slogan, description, logoStyle, paletteColors } = await req.json()

    if (!businessType || !businessName || !logoStyle) {
      return NextResponse.json(
        { error: 'businessType, businessName et logoStyle sont requis' },
        { status: 400 }
      )
    }

    // Client admin (bypass RLS)
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
        description: 'Logo Express - Génération de 4 logos + identité visuelle'
      })

    // Gemini génère les 4 prompts + palette + fonts
    const geminiResult = await generateLogoPrompts(
      businessType,
      businessName,
      slogan || '',
      description || '',
      logoStyle,
      paletteColors || [],
    )

    console.log('Gemini generated', geminiResult.logos.length, 'logo prompts')

    // Soumettre 4 jobs fal.ai en parallèle (mode queue)
    const falJobs = await Promise.allSettled(
      geminiResult.logos.map(async (logo) => {
        const submitResponse = await fetch('https://queue.fal.run/fal-ai/flux/dev', {
          method: 'POST',
          headers: {
            'Authorization': `Key ${FAL_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: logo.prompt,
            image_size: 'square_hd',
            num_images: 1,
            enable_safety_checker: false,
          }),
        })

        if (!submitResponse.ok) {
          const errText = await submitResponse.text()
          throw new Error(`fal.ai (${submitResponse.status}): ${errText}`)
        }

        const submitData = await submitResponse.json()
        return {
          approach: logo.approach,
          prompt: logo.prompt,
          status_url: submitData.status_url || null,
          response_url: submitData.response_url || null,
        }
      })
    )

    // Construire la réponse avec les résultats de chaque job
    const logos = falJobs.map((result, index) => {
      const approach = geminiResult.logos[index].approach
      if (result.status === 'fulfilled') {
        return {
          approach,
          prompt: result.value.prompt,
          status_url: result.value.status_url,
          response_url: result.value.response_url,
          error: null,
        }
      }
      return {
        approach,
        prompt: geminiResult.logos[index].prompt,
        status_url: null,
        response_url: null,
        error: result.reason?.message || 'Erreur fal.ai',
      }
    })

    return NextResponse.json({
      success: true,
      result: {
        logos,
        palette: geminiResult.palette,
        fonts: geminiResult.fonts,
        business_name: businessName,
        slogan: slogan || '',
        credits_used: CREDITS_COST,
        credits_remaining: creditData.balance - CREDITS_COST,
      }
    })
  } catch (error) {
    console.error('Erreur logo express:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
