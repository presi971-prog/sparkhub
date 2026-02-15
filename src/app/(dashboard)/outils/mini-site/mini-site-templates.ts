// ==========================================
// MINI SITE VITRINE - Templates & Config
// ==========================================

// --- 6 Ambiances visuelles ---

export interface SiteTheme {
  id: string
  name: string
  description: string
  // Couleurs par defaut
  bgColor: string
  headerBg: string
  textColor: string
  mutedColor: string
  cardBg: string
  cardBorder: string
  footerBg: string
  footerText: string
  // Preview
  previewBg: string
  previewAccent: string
  // Prompt IA pour image de couverture
  aiPrompt: string
}

export const SITE_THEMES: SiteTheme[] = [
  {
    id: 'tropical_creole',
    name: 'Tropical Creole',
    description: 'Couleurs chaudes, palmiers, soleil couchant — parfait pour les restos antillais',
    bgColor: '#FFF8F0',
    headerBg: 'linear-gradient(135deg, #D4380D 0%, #B8860B 50%, #228B22 100%)',
    textColor: '#2C1810',
    mutedColor: '#8B7355',
    cardBg: '#FFFFFF',
    cardBorder: '#E8B84B',
    footerBg: '#2C1810',
    footerText: '#F5E6D3',
    previewBg: 'bg-gradient-to-br from-orange-500 via-yellow-500 to-green-600',
    previewAccent: 'text-white',
    aiPrompt: 'Beautiful Caribbean tropical scene with palm trees at golden hour sunset, warm orange and yellow tones, Guadeloupe island vibes, lush tropical vegetation, ocean in background, professional photography, no text no letters no words',
  },
  {
    id: 'moderne_epure',
    name: 'Moderne Epure',
    description: 'Blanc, minimaliste, elegant — pour un look clean et pro',
    bgColor: '#FFFFFF',
    headerBg: '#FFFFFF',
    textColor: '#1A1A1A',
    mutedColor: '#6B7280',
    cardBg: '#F9FAFB',
    cardBorder: '#E5E7EB',
    footerBg: '#111827',
    footerText: '#D1D5DB',
    previewBg: 'bg-gradient-to-br from-gray-50 to-white',
    previewAccent: 'text-gray-900',
    aiPrompt: 'Clean minimalist modern architecture interior, white marble surfaces, soft natural light, elegant geometric shapes, professional business aesthetic, premium clean look, no text no letters no words',
  },
  {
    id: 'nuit_electrique',
    name: 'Nuit Electrique',
    description: 'Sombre avec neons bleu/rose — ideal pour bars et food trucks de nuit',
    bgColor: '#0A0A0F',
    headerBg: 'linear-gradient(135deg, #0A0A0F 0%, #1A1A2E 100%)',
    textColor: '#E0E0E0',
    mutedColor: '#9CA3AF',
    cardBg: '#111122',
    cardBorder: '#1E1E3F',
    footerBg: '#050510',
    footerText: '#9CA3AF',
    previewBg: 'bg-gradient-to-br from-purple-900 to-pink-600',
    previewAccent: 'text-cyan-400',
    aiPrompt: 'Dark moody neon nightlife scene, electric blue and pink neon lights reflecting on wet streets, urban nightclub atmosphere, bokeh city lights, cyberpunk vibes, no text no letters no words',
  },
  {
    id: 'nature_zen',
    name: 'Nature & Zen',
    description: 'Vert doux, bambou, zen — pour les salons bien-etre et spas',
    bgColor: '#F0F7F0',
    headerBg: 'linear-gradient(135deg, #2D5A3F 0%, #3B7A57 100%)',
    textColor: '#1A3C2A',
    mutedColor: '#5F8570',
    cardBg: '#FFFFFF',
    cardBorder: '#B8D4C8',
    footerBg: '#1A3C2A',
    footerText: '#B8D4C8',
    previewBg: 'bg-gradient-to-br from-green-700 to-emerald-500',
    previewAccent: 'text-green-100',
    aiPrompt: 'Serene zen garden with bamboo, smooth stones, flowing water, soft green natural light, peaceful spa atmosphere, tropical plants, wellness and relaxation mood, no text no letters no words',
  },
  {
    id: 'street_urban',
    name: 'Street & Urban',
    description: 'Noir avec jaune/rouge, graffiti — pour food trucks et fast food',
    bgColor: '#1A1A1A',
    headerBg: 'linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%)',
    textColor: '#FFFFFF',
    mutedColor: '#9CA3AF',
    cardBg: '#2A2A2A',
    cardBorder: '#3A3A3A',
    footerBg: '#0A0A0A',
    footerText: '#9CA3AF',
    previewBg: 'bg-gradient-to-br from-gray-900 to-yellow-600',
    previewAccent: 'text-yellow-400',
    aiPrompt: 'Bold urban street art wall with colorful graffiti, vibrant red and yellow neon signs, food truck culture, energetic street food atmosphere, concrete textures, warm amber lighting, no text no letters no words',
  },
  {
    id: 'premium_or',
    name: 'Premium & Or',
    description: 'Bordeaux et or, luxe — pour traiteurs et services haut de gamme',
    bgColor: '#FFFFF5',
    headerBg: 'linear-gradient(135deg, #8B0000 0%, #6B0000 100%)',
    textColor: '#2C1810',
    mutedColor: '#8B7355',
    cardBg: '#FFFDF5',
    cardBorder: '#C5993A',
    footerBg: '#2C1810',
    footerText: '#D4B896',
    previewBg: 'bg-gradient-to-br from-red-900 to-yellow-700',
    previewAccent: 'text-yellow-300',
    aiPrompt: 'Luxury premium interior with rich burgundy velvet and gold accents, ornate decorative elements, warm candlelight ambiance, elegant fine dining setting, crystal chandeliers, opulent atmosphere, no text no letters no words',
  },
]

export function getSiteTheme(id: string): SiteTheme {
  return SITE_THEMES.find(t => t.id === id) || SITE_THEMES[0]
}

// --- 3 Styles de police ---

export interface FontStyle {
  id: string
  name: string
  description: string
  titleFont: string
  bodyFont: string
  googleFontsImport: string
}

export const FONT_STYLES: FontStyle[] = [
  {
    id: 'moderne',
    name: 'Moderne',
    description: 'Clean, sans empattement',
    titleFont: "'Inter', sans-serif",
    bodyFont: "'Inter', sans-serif",
    googleFontsImport: 'Inter:wght@400;500;600;700',
  },
  {
    id: 'elegant',
    name: 'Elegant',
    description: 'Avec empattement, chic',
    titleFont: "'Playfair Display', serif",
    bodyFont: "'Lora', serif",
    googleFontsImport: 'Playfair+Display:wght@400;500;600;700|Lora:wght@400;500;600;700',
  },
  {
    id: 'fun',
    name: 'Fun',
    description: 'Arrondi, decontracte',
    titleFont: "'Nunito', sans-serif",
    bodyFont: "'Nunito', sans-serif",
    googleFontsImport: 'Nunito:wght@400;500;600;700',
  },
]

export function getFontStyle(id: string): FontStyle {
  return FONT_STYLES.find(f => f.id === id) || FONT_STYLES[0]
}

// --- 2 Layouts de services ---

export interface ServicesLayout {
  id: string
  name: string
  description: string
}

export const SERVICES_LAYOUTS: ServicesLayout[] = [
  {
    id: 'cards',
    name: 'Cartes',
    description: 'Chaque service dans un encadre',
  },
  {
    id: 'list',
    name: 'Liste',
    description: 'Services en lignes avec prix a droite',
  },
]

// --- 12 Couleurs pre-selectionnees ---

export const PRESET_COLORS = [
  { hex: '#E67E22', name: 'Orange' },
  { hex: '#3B82F6', name: 'Bleu' },
  { hex: '#EF4444', name: 'Rouge' },
  { hex: '#10B981', name: 'Vert' },
  { hex: '#8B5CF6', name: 'Violet' },
  { hex: '#EC4899', name: 'Rose' },
  { hex: '#F59E0B', name: 'Jaune' },
  { hex: '#06B6D4', name: 'Cyan' },
  { hex: '#6366F1', name: 'Indigo' },
  { hex: '#D97706', name: 'Ambre' },
  { hex: '#14B8A6', name: 'Teal' },
  { hex: '#F43F5E', name: 'Framboise' },
]

// --- Sections configurables ---

export interface SectionConfig {
  id: string
  name: string
  icon: string
  defaultEnabled: boolean
}

export const SECTIONS_CONFIG: SectionConfig[] = [
  { id: 'hero', name: 'Couverture', icon: '🖼️', defaultEnabled: true },
  { id: 'about', name: 'A propos', icon: '📝', defaultEnabled: true },
  { id: 'services', name: 'Services / Produits', icon: '🛍️', defaultEnabled: true },
  { id: 'gallery', name: 'Galerie photos', icon: '📷', defaultEnabled: true },
  { id: 'hours', name: 'Horaires', icon: '🕐', defaultEnabled: true },
  { id: 'contact', name: 'Contact', icon: '📍', defaultEnabled: true },
  { id: 'social', name: 'Reseaux sociaux', icon: '📱', defaultEnabled: true },
]

export const DEFAULT_SECTIONS_ORDER = SECTIONS_CONFIG.map(s => s.id)

// --- Types de commerce ---

export const BUSINESS_TYPES = [
  'Restaurant',
  'Snack / Food truck',
  'Bar / Lounge',
  'Salon de coiffure',
  'Institut de beaute',
  'Spa / Bien-etre',
  'Boulangerie / Patisserie',
  'Traiteur',
  'Boutique',
  'Bijouterie',
  'Service a domicile',
  'Artisan',
  'Auto / Moto',
  'Autre',
]

// --- Jours de la semaine ---

export const DAYS_OF_WEEK = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche',
]

// --- Questionnaire image de couverture ---
// Structure d'un vrai prompt pro : Style + Sujet + Description precise + Cadrage + Personnes + Ambiance + Lumiere + Couleurs + Decor + Elements

export interface HeroImageConfig {
  // 1. Style visuel
  style: string
  // 2. Sujet principal (categorie)
  subject: string
  // 3. Description precise (texte libre pour les besoins specifiques)
  subject_detail: string
  // 4. Cadrage
  framing: string
  // 5. Personnes (si sujet = personnes ou si on veut des gens en plus)
  include_people: boolean
  people_count?: string
  people_age?: string
  people_origin?: string
  people_action?: string
  people_clothing?: string
  // 6. Commerce
  commerce_view?: string
  // 7. Produits
  product_type?: string
  product_presentation?: string
  // 8. Paysage
  landscape_type?: string
  // 9. Universels
  ambiance?: string
  lumiere?: string
  couleurs?: string
  lieu?: string
  elements?: string[]
  // 10. Priorite — ce qui compte le plus pour le pro
  priority?: string
}

export const HERO_IMAGE_DEFAULTS: HeroImageConfig = {
  style: '',
  subject: '',
  subject_detail: '',
  framing: '',
  include_people: false,
}

export interface HeroOption {
  id: string
  label: string
  icon: string
  desc?: string
}

export interface HeroQuestion {
  id: string
  title: string
  subtitle: string
  options: HeroOption[]
  multiSelect?: boolean
}

// ====== Q1 — STYLE VISUEL (composante #1 d'un prompt) ======
export const HERO_Q_STYLE: HeroQuestion = {
  id: 'style',
  title: 'Quel style d\'image ?',
  subtitle: 'C\'est le rendu visuel de ton image. Choisis celui qui correspond le mieux a ton activite.',
  options: [
    { id: 'photo_realiste', label: 'Photo realiste', icon: '📸', desc: 'Comme une vraie photo prise par un photographe pro' },
    { id: 'photo_hyper_realiste', label: 'Hyper-realiste', icon: '🔬', desc: 'Ultra-detaille, chaque detail est net, plus vrai que nature' },
    { id: 'illustration', label: 'Illustration', icon: '🎨', desc: 'Un dessin numerique moderne, colore et creatif' },
    { id: '3d_render', label: '3D', icon: '💎', desc: 'Image en 3 dimensions, lisse et moderne comme dans un jeu video' },
    { id: 'anime', label: 'Anime / Manga', icon: '⚡', desc: 'Style dessin anime japonais avec des couleurs vives' },
    { id: 'aquarelle', label: 'Aquarelle', icon: '🖌️', desc: 'Effet peinture artistique avec des couleurs qui se melangent' },
    { id: 'flat_design', label: 'Minimaliste', icon: '◼️', desc: 'Formes simples et epurees, comme une icone ou une affiche' },
    { id: 'art_conceptuel', label: 'Art conceptuel', icon: '🌀', desc: 'Creatif et original, peut etre abstrait ou surrealiste' },
  ],
}

// ====== Q2 — SUJET PRINCIPAL ======
export const HERO_Q_SUBJECT: HeroQuestion = {
  id: 'subject',
  title: 'Que veux-tu montrer sur cette image ?',
  subtitle: 'C\'est le sujet principal, ce que les gens verront en premier en arrivant sur ton site.',
  options: [
    { id: 'personnes', label: 'Des personnes', icon: '👥', desc: 'Des gens : toi, tes employes, des clients...' },
    { id: 'commerce', label: 'Mon commerce', icon: '🏪', desc: 'Ton local, ta boutique, ton restaurant...' },
    { id: 'produits', label: 'Mes produits', icon: '🍽️', desc: 'Tes plats, tes creations, ce que tu vends...' },
    { id: 'paysage', label: 'Un paysage', icon: '🌴', desc: 'Une plage, une vue, un decor naturel...' },
    { id: 'concept', label: 'Un concept / une idee', icon: '💡', desc: 'Quelque chose d\'abstrait : un cerveau, la technologie, un symbole...' },
    { id: 'objet', label: 'Un objet precis', icon: '🎯', desc: 'Un outil, un accessoire, quelque chose de specifique...' },
  ],
}

// ====== Q3 — CADRAGE (composante essentielle du prompt) ======
export const HERO_Q_FRAMING: HeroQuestion = {
  id: 'framing',
  title: 'Quel cadrage ?',
  subtitle: 'C\'est la distance entre la camera et le sujet. Ca change completement le rendu.',
  options: [
    { id: 'gros_plan', label: 'Gros plan', icon: '🔍', desc: 'Tres proche, on voit les details (un plat, un visage, un objet)' },
    { id: 'plan_moyen', label: 'Plan moyen', icon: '📐', desc: 'On voit le sujet et un peu de l\'environnement autour' },
    { id: 'plan_large', label: 'Plan large', icon: '🖼️', desc: 'Vue d\'ensemble, on voit tout le decor (ideal pour un paysage ou un lieu)' },
    { id: 'plongee', label: 'Vue du dessus', icon: '🦅', desc: 'Comme si on regardait d\'en haut (beau pour un plat ou une table)' },
    { id: 'contre_plongee', label: 'Contre-plongee', icon: '⬆️', desc: 'Vue d\'en bas qui donne un effet puissant et imposant' },
    { id: 'face', label: 'De face', icon: '🧑', desc: 'Droit devant, comme un portrait ou une devanture de face' },
  ],
}

// ====== PERSONNES ======
export const HERO_Q_PEOPLE_COUNT: HeroQuestion = {
  id: 'people_count',
  title: 'Combien de personnes ?',
  subtitle: 'Le nombre de personnes visibles sur l\'image. Plus il y en a, moins on voit les details de chacune.',
  options: [
    { id: '1', label: 'Une seule', icon: '🧑', desc: 'Portrait ou silhouette unique — ideal pour mettre en avant un chef, un artisan, toi-meme' },
    { id: '2-3', label: '2 ou 3', icon: '👫', desc: 'Un petit groupe — parfait pour montrer une equipe ou des clients' },
    { id: 'groupe', label: 'Un groupe', icon: '👨‍👩‍👧‍👦', desc: 'Plusieurs personnes — donne un effet convivial, festif ou communautaire' },
  ],
}

export const HERO_Q_PEOPLE_AGE: HeroQuestion = {
  id: 'people_age',
  title: 'Quel age ?',
  subtitle: 'L\'age des personnes sur l\'image. Choisis celui qui represente le mieux ta clientele ou ton equipe.',
  options: [
    { id: 'enfants', label: 'Enfants', icon: '👶', desc: 'Bebes ou enfants — pour les activites familiales, creches, etc.' },
    { id: 'jeunes', label: 'Jeunes (18-30)', icon: '🧑', desc: 'Jeunes adultes dynamiques — ideal pour les activites branchees' },
    { id: 'adultes', label: 'Adultes (30-50)', icon: '🧔', desc: 'Adultes actifs — le choix le plus courant pour les pros' },
    { id: 'seniors', label: 'Seniors (50+)', icon: '👴', desc: 'Personnes matures — pour les services seniors ou pour inspirer confiance' },
    { id: 'mix', label: 'Ages melanges', icon: '👨‍👩‍👧', desc: 'Un melange de generations — donne un cote familial et inclusif' },
  ],
}

export const HERO_Q_PEOPLE_ORIGIN: HeroQuestion = {
  id: 'people_origin',
  title: 'Quelle apparence ?',
  subtitle: 'L\'apparence des personnes sur l\'image. Choisis ce qui represente le mieux ta clientele ou ton equipe.',
  options: [
    { id: 'antillaise', label: 'Antillaise / Caribbeenne', icon: '🌺', desc: 'Peau noire ou metissee, style caribbeen — le choix naturel en Guadeloupe' },
    { id: 'africaine', label: 'Africaine', icon: '🌍', desc: 'Peau noire, traits africains — pour representer la diaspora' },
    { id: 'europeenne', label: 'Europeenne', icon: '🏔️', desc: 'Peau claire, traits europeens' },
    { id: 'asiatique', label: 'Asiatique', icon: '🏯', desc: 'Traits asiatiques — pour les restos asiatiques, etc.' },
    { id: 'mixte', label: 'Mixte / Diverse', icon: '🌈', desc: 'Un melange d\'origines — reflete la diversite de la Guadeloupe' },
  ],
}

export const HERO_Q_PEOPLE_ACTION: HeroQuestion = {
  id: 'people_action',
  title: 'Que font-ils ?',
  subtitle: 'L\'action des personnes sur l\'image. Ca donne vie et contexte a ta photo.',
  options: [
    { id: 'sourient', label: 'Sourient / Posent', icon: '😊', desc: 'Regardent la camera avec le sourire — classique et accueillant' },
    { id: 'mangent', label: 'Mangent / Boivent', icon: '🍴', desc: 'En train de deguster un plat ou une boisson — parfait pour la restauration' },
    { id: 'travaillent', label: 'Travaillent', icon: '💼', desc: 'Concentres sur leur metier — montre le savoir-faire et le professionnalisme' },
    { id: 'discutent', label: 'Discutent', icon: '💬', desc: 'En conversation — donne un cote chaleureux et social' },
    { id: 'dansent', label: 'Dansent / Font la fete', icon: '💃', desc: 'En mouvement, festifs — ideal pour les bars, les evenements' },
    { id: 'cuisinent', label: 'Cuisinent', icon: '👨‍🍳', desc: 'En cuisine, preparent des plats — montre le cote artisanal' },
  ],
}

export const HERO_Q_PEOPLE_CLOTHING: HeroQuestion = {
  id: 'people_clothing',
  title: 'Comment sont-ils habilles ?',
  subtitle: 'La tenue vestimentaire donne tout de suite le ton : decontracte, pro, chic ou culturel.',
  options: [
    { id: 'decontracte', label: 'Decontracte', icon: '👕', desc: 'T-shirt, short, tenue legere — ambiance relax et naturelle' },
    { id: 'elegant', label: 'Elegant / Chic', icon: '👔', desc: 'Chemise, robe, tenue soignee — pour un look premium et raffinee' },
    { id: 'professionnel', label: 'Tenue pro / Uniforme', icon: '👨‍🍳', desc: 'Toque de chef, blouse, tablier — montre le metier clairement' },
    { id: 'traditionnel', label: 'Tenue traditionnelle', icon: '👗', desc: 'Madras, robe creole — met en valeur la culture antillaise' },
  ],
}

// ====== COMMERCE ======
export const HERO_Q_COMMERCE_VIEW: HeroQuestion = {
  id: 'commerce_view',
  title: 'Quelle vue de ton commerce ?',
  subtitle: 'Quelle partie de ton commerce veux-tu montrer ? C\'est la premiere impression que les visiteurs auront.',
  options: [
    { id: 'devanture', label: 'La devanture / facade', icon: '🏠', desc: 'L\'exterieur de ton commerce vu depuis la rue — montre ou te trouver' },
    { id: 'interieur', label: 'L\'interieur / la salle', icon: '🛋️', desc: 'L\'ambiance a l\'interieur — tables, decoration, espace d\'accueil' },
    { id: 'comptoir', label: 'Le comptoir / bar', icon: '🍸', desc: 'Le bar ou le comptoir — ideal pour les bars, snacks, boulangeries' },
    { id: 'cuisine', label: 'La cuisine / atelier', icon: '🔥', desc: 'Les coulisses, la ou tu crees — montre ton savoir-faire' },
    { id: 'terrasse', label: 'La terrasse', icon: '☀️', desc: 'L\'espace en plein air — met en avant le beau temps et la convivialite' },
  ],
}

// ====== PRODUITS ======
export const HERO_Q_PRODUCT_TYPE: HeroQuestion = {
  id: 'product_type',
  title: 'Quel type de produits ?',
  subtitle: 'Dis-nous ce que tu vends pour que l\'image colle parfaitement a ton activite.',
  options: [
    { id: 'plats_creoles', label: 'Plats creoles', icon: '🍛', desc: 'Colombo, bokit, accras, court-bouillon... la cuisine antillaise' },
    { id: 'patisseries', label: 'Patisseries / Desserts', icon: '🧁', desc: 'Gateaux, tourments d\'amour, flan coco, pains au beurre...' },
    { id: 'boissons', label: 'Boissons / Cocktails', icon: '🍹', desc: 'Ti-punch, jus de fruits frais, cocktails, smoothies...' },
    { id: 'fruits', label: 'Fruits tropicaux', icon: '🥭', desc: 'Mangues, ananas, goyaves, fruits de la passion, bananes...' },
    { id: 'cosmetiques', label: 'Cosmetiques / Soins', icon: '🧴', desc: 'Cremes, huiles, savons, soins capillaires, produits naturels' },
    { id: 'artisanat', label: 'Artisanat / Bijoux', icon: '💍', desc: 'Creations artisanales, bijoux, objets faits main' },
    { id: 'vetements', label: 'Vetements / Mode', icon: '👗', desc: 'Robes, chemises, accessoires, mode locale ou importee' },
  ],
}

export const HERO_Q_PRODUCT_PRESENTATION: HeroQuestion = {
  id: 'product_presentation',
  title: 'Quelle mise en scene ?',
  subtitle: 'Comment veux-tu presenter tes produits ? La mise en scene change completement l\'impact visuel.',
  options: [
    { id: 'gros_plan', label: 'Gros plan (focus produit)', icon: '🔍', desc: 'Le produit occupe toute l\'image — on voit chaque detail, chaque texture' },
    { id: 'table_dressee', label: 'Table dressee', icon: '🍽️', desc: 'Produits poses sur une belle table decoree — style food photography' },
    { id: 'etalage', label: 'Etalage / Vitrine', icon: '🏬', desc: 'Plusieurs produits presentes ensemble — comme dans une boutique' },
    { id: 'en_preparation', label: 'En preparation', icon: '👨‍🍳', desc: 'Le produit en train d\'etre fabrique — montre le processus de creation' },
    { id: 'dans_les_mains', label: 'Tenu dans les mains', icon: '🤲', desc: 'Quelqu\'un tient le produit — ajoute un cote humain et authentique' },
  ],
}

// ====== PAYSAGE ======
export const HERO_Q_LANDSCAPE_TYPE: HeroQuestion = {
  id: 'landscape_type',
  title: 'Quel type de paysage ?',
  subtitle: 'Le paysage en arriere-plan de ton image. Choisis celui qui rappelle le mieux ton environnement.',
  options: [
    { id: 'plage', label: 'Plage / Bord de mer', icon: '🏖️', desc: 'Sable blanc, eau turquoise, cocotiers — l\'image classique des Antilles' },
    { id: 'montagne', label: 'Montagne / Volcan', icon: '🏔️', desc: 'La Soufriere, mornes verdoyants — pour un cote nature et puissant' },
    { id: 'foret', label: 'Foret tropicale', icon: '🌿', desc: 'Vegetation luxuriante, cascades, lianes — ambiance jungle et aventure' },
    { id: 'ville', label: 'Ville / Rue', icon: '🏙️', desc: 'Rues animees, maisons colorees, vie urbaine — Pointe-a-Pitre, Basse-Terre...' },
    { id: 'campagne', label: 'Campagne / Champs', icon: '🌾', desc: 'Champs de canne a sucre, bananeraies, campagne verdoyante' },
    { id: 'port', label: 'Port / Marina', icon: '⛵', desc: 'Bateaux, quais, marina — ambiance maritime et detendue' },
  ],
}

// ====== UNIVERSELS ======
export const HERO_Q_AMBIANCE: HeroQuestion = {
  id: 'ambiance',
  title: 'Quelle ambiance ?',
  subtitle: 'L\'emotion que les visiteurs de ton site doivent ressentir en voyant l\'image. C\'est le "feeling" general.',
  options: [
    { id: 'chaleureuse', label: 'Chaleureuse & Familiale', icon: '🤗', desc: 'Accueillante, rassurante — on se sent comme a la maison' },
    { id: 'festive', label: 'Festive & Coloree', icon: '🎊', desc: 'Joyeuse, animee, pleine de vie — envie de faire la fete' },
    { id: 'zen', label: 'Zen & Apaisante', icon: '🧘', desc: 'Calme, sereine, relaxante — on se detend rien qu\'en regardant' },
    { id: 'luxe', label: 'Chic & Raffinee', icon: '💎', desc: 'Elegante, haut de gamme — pour un positionnement premium' },
    { id: 'dynamique', label: 'Dynamique & Energique', icon: '⚡', desc: 'Pleine d\'energie, ca bouge — pour les activites sportives ou fast food' },
    { id: 'romantique', label: 'Romantique & Douce', icon: '🌹', desc: 'Tendre, poetique, delicate — pour les fleuristes, wedding planners...' },
    { id: 'futuriste', label: 'Futuriste & Tech', icon: '🚀', desc: 'Moderne, technologique, avant-gardiste — pour les services digitaux' },
    { id: 'mysterieuse', label: 'Mysterieuse & Sombre', icon: '🌑', desc: 'Intrigante, profonde, un peu sombre — pour les bars, clubs, escape games' },
  ],
}

export const HERO_Q_LUMIERE: HeroQuestion = {
  id: 'lumiere',
  title: 'Quelle lumiere ?',
  subtitle: 'La lumiere donne le ton a toute l\'image. Un coucher de soleil et un neon ne racontent pas la meme histoire.',
  options: [
    { id: 'matin', label: 'Matin lumineux', icon: '🌅', desc: 'Lumiere douce et fraiche du matin — sensation de nouveau depart' },
    { id: 'apres_midi', label: 'Plein soleil', icon: '☀️', desc: 'Soleil eclatant, couleurs vives — l\'energie des tropiques' },
    { id: 'golden_hour', label: 'Coucher de soleil', icon: '🌇', desc: 'Lumiere doree et chaude du soir — la plus belle lumiere pour les photos' },
    { id: 'nuit', label: 'Nuit / Neons', icon: '🌙', desc: 'Eclairage nocturne, neons, lumieres de ville — ambiance nightlife' },
    { id: 'tamisee', label: 'Tamisee / Intime', icon: '🕯️', desc: 'Lumiere basse, bougies, reflets — ambiance cozy et romantique' },
    { id: 'studio', label: 'Eclairage studio', icon: '💡', desc: 'Lumiere artificielle propre et nette — rendu professionnel type catalogue' },
    { id: 'dramatique', label: 'Dramatique / Contrastee', icon: '🎭', desc: 'Forts contrastes ombre/lumiere — effet artistique et impactant' },
  ],
}

export const HERO_Q_COULEURS: HeroQuestion = {
  id: 'couleurs',
  title: 'Quelles couleurs dominantes ?',
  subtitle: 'Les couleurs principales de ton image. Elles influencent fortement l\'emotion ressentie par le visiteur.',
  options: [
    { id: 'chauds', label: 'Tons chauds (rouge, orange, jaune)', icon: '🔥', desc: 'Energie, passion, appetit — parfait pour la cuisine et les ambiances festives' },
    { id: 'froids', label: 'Tons froids (bleu, vert)', icon: '🧊', desc: 'Calme, confiance, fraicheur — ideal pour le bien-etre et la tech' },
    { id: 'vifs', label: 'Vifs & Colores', icon: '🎨', desc: 'Toutes les couleurs intenses — joyeux, pop, carnaval' },
    { id: 'pastels', label: 'Pastels & Doux', icon: '🌸', desc: 'Couleurs adoucies, tendres — elegance discrete et delicatesse' },
    { id: 'naturels', label: 'Naturels (bois, terre, vert)', icon: '🌿', desc: 'Marron, vert feuille, beige — bio, eco, authentique' },
    { id: 'sombres', label: 'Sombres & Contrastes', icon: '🖤', desc: 'Noir, gris fonce, touches de lumiere — mystere et sophistication' },
    { id: 'neon', label: 'Neon / Electrique', icon: '💜', desc: 'Rose fluo, bleu electrique, violet — nightlife, urbain, moderne' },
    { id: 'noir_et_or', label: 'Noir & Or', icon: '✨', desc: 'Le duo luxe par excellence — premium, bijouterie, gastronomie' },
  ],
}

export const HERO_Q_LIEU: HeroQuestion = {
  id: 'lieu',
  title: 'Quel decor / arriere-plan ?',
  subtitle: 'C\'est ce qu\'on voit derriere le sujet principal. Le decor plante le contexte de ton activite.',
  options: [
    { id: 'interieur', label: 'Interieur', icon: '🏠', desc: 'A l\'interieur d\'un lieu — salon, restaurant, boutique...' },
    { id: 'terrasse', label: 'Terrasse', icon: '☂️', desc: 'Espace ouvert avec toit ou parasol — le meilleur des deux mondes' },
    { id: 'plage', label: 'Plage', icon: '🏖️', desc: 'Sable, mer, ciel bleu — l\'image carte postale des Antilles' },
    { id: 'rue', label: 'Rue animee', icon: '🛤️', desc: 'Rue coloree, passants, commerces — vie urbaine et dynamisme' },
    { id: 'marche', label: 'Marche', icon: '🧺', desc: 'Etals colores, fruits, epices — authenticite et tradition' },
    { id: 'nature', label: 'Nature / Vegetation', icon: '🌺', desc: 'Arbres, fleurs, verdure — nature tropicale luxuriante' },
    { id: 'abstrait', label: 'Fond abstrait / Uni', icon: '🌀', desc: 'Fond de couleur ou motif — pour mettre tout le focus sur le sujet' },
    { id: 'aucun', label: 'Pas d\'arriere-plan', icon: '⬜', desc: 'Fond blanc ou transparent — style catalogue, epure au maximum' },
  ],
}

export const HERO_Q_ELEMENTS: HeroQuestion = {
  id: 'elements',
  title: 'Des elements en plus ?',
  subtitle: 'Des petits details qui enrichissent l\'image. Tu peux en choisir plusieurs pour personnaliser encore plus.',
  multiSelect: true,
  options: [
    { id: 'vegetation', label: 'Vegetation tropicale', icon: '🌴', desc: 'Palmiers, bananiers, feuilles exotiques en bordure de l\'image' },
    { id: 'fleurs', label: 'Fleurs', icon: '🌺', desc: 'Hibiscus, bougainvilliers, frangipanier — touches de couleur naturelles' },
    { id: 'fruits', label: 'Fruits tropicaux', icon: '🍍', desc: 'Ananas, mangues, noix de coco — rappelle la gastronomie locale' },
    { id: 'mer', label: 'Mer / Ocean', icon: '🌊', desc: 'Eau turquoise, vagues, ecume — l\'appel de la Caraibe' },
    { id: 'architecture', label: 'Architecture creole', icon: '🏡', desc: 'Cases colorees, balcons en bois, toits en tole — le patrimoine local' },
    { id: 'bougies', label: 'Bougies / Lumieres', icon: '🕯️', desc: 'Bougies, guirlandes, lanternes — ambiance chaleureuse et intime' },
    { id: 'musique', label: 'Instruments / Musique', icon: '🎶', desc: 'Ka, guitare, maracas — la musique fait partie de la culture' },
    { id: 'technologie', label: 'Technologie / Digital', icon: '💻', desc: 'Ecrans, circuits, hologrammes — pour les metiers du digital et de la tech' },
    { id: 'particules', label: 'Particules / Effets lumineux', icon: '✨', desc: 'Paillettes, etincelles, effets de lumiere — ajoute de la magie et du wow' },
    { id: 'fumee', label: 'Fumee / Brume', icon: '🌫️', desc: 'Brume legere, vapeur, fumee — ajoute du mystere et de la profondeur' },
  ],
}

// ====== PRIORITE — derniere question avant la generation ======
export const HERO_Q_PRIORITY: HeroQuestion = {
  id: 'priority',
  title: 'Qu\'est-ce qui compte le plus pour toi ?',
  subtitle: 'L\'IA va mettre l\'accent sur ce que tu choisis ici. C\'est ce qui sera le mieux respecte dans l\'image finale.',
  options: [
    { id: 'personnes', label: 'Les personnes', icon: '👥', desc: 'Le nombre, l\'apparence et l\'action des gens dans l\'image' },
    { id: 'cadrage', label: 'Le cadrage', icon: '📐', desc: 'L\'angle de vue et la distance (gros plan, plan large, vue du dessus...)' },
    { id: 'description', label: 'Ma description', icon: '✍️', desc: 'Le texte que j\'ai ecrit dans "Decris precisement ce que tu veux voir"' },
    { id: 'ambiance', label: 'L\'ambiance', icon: '🎨', desc: 'Les couleurs, la lumiere, le decor et l\'atmosphere generale' },
  ],
}
