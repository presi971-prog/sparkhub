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
  subtitle: 'Le rendu visuel que tu veux obtenir',
  options: [
    { id: 'photo_realiste', label: 'Photo realiste', icon: '📸', desc: 'Comme une vraie photo pro' },
    { id: 'photo_hyper_realiste', label: 'Hyper-realiste', icon: '🔬', desc: 'Ultra-detaille, plus vrai que nature' },
    { id: 'illustration', label: 'Illustration digitale', icon: '🎨', desc: 'Dessin numerique moderne' },
    { id: '3d_render', label: '3D / Render', icon: '💎', desc: 'Image 3D lisse et moderne' },
    { id: 'anime', label: 'Anime / Manga', icon: '⚡', desc: 'Style japonais anime' },
    { id: 'aquarelle', label: 'Aquarelle / Peinture', icon: '🖌️', desc: 'Effet peinture artistique' },
    { id: 'flat_design', label: 'Flat / Minimaliste', icon: '◼️', desc: 'Formes simples et epurees' },
    { id: 'art_conceptuel', label: 'Art conceptuel', icon: '🌀', desc: 'Creatif, abstrait, artistique' },
  ],
}

// ====== Q2 — SUJET PRINCIPAL ======
export const HERO_Q_SUBJECT: HeroQuestion = {
  id: 'subject',
  title: 'Que veux-tu montrer ?',
  subtitle: 'Le sujet principal de ton image',
  options: [
    { id: 'personnes', label: 'Des personnes', icon: '👥' },
    { id: 'commerce', label: 'Mon lieu / commerce', icon: '🏪' },
    { id: 'produits', label: 'Mes produits / plats', icon: '🍽️' },
    { id: 'paysage', label: 'Un paysage / decor', icon: '🌴' },
    { id: 'concept', label: 'Un concept / une idee', icon: '💡', desc: 'Cerveau, technologie, symbole...' },
    { id: 'objet', label: 'Un objet precis', icon: '🎯' },
  ],
}

// ====== Q3 — CADRAGE (composante essentielle du prompt) ======
export const HERO_Q_FRAMING: HeroQuestion = {
  id: 'framing',
  title: 'Quel cadrage ?',
  subtitle: 'Comment la scene est filmee',
  options: [
    { id: 'gros_plan', label: 'Gros plan', icon: '🔍', desc: 'Focus sur un detail' },
    { id: 'plan_moyen', label: 'Plan moyen', icon: '📐', desc: 'Sujet + environnement' },
    { id: 'plan_large', label: 'Plan large / Panoramique', icon: '🖼️', desc: 'Vue d\'ensemble' },
    { id: 'plongee', label: 'Vue du dessus', icon: '🦅', desc: 'Camera au-dessus' },
    { id: 'contre_plongee', label: 'Contre-plongee', icon: '⬆️', desc: 'Camera en dessous, effet puissant' },
    { id: 'face', label: 'De face / Portrait', icon: '🧑', desc: 'Droit devant' },
  ],
}

// ====== PERSONNES ======
export const HERO_Q_PEOPLE_COUNT: HeroQuestion = {
  id: 'people_count',
  title: 'Combien de personnes ?',
  subtitle: '',
  options: [
    { id: '1', label: 'Une seule', icon: '🧑' },
    { id: '2-3', label: '2 ou 3', icon: '👫' },
    { id: 'groupe', label: 'Un groupe', icon: '👨‍👩‍👧‍👦' },
  ],
}

export const HERO_Q_PEOPLE_AGE: HeroQuestion = {
  id: 'people_age',
  title: 'Quel age ?',
  subtitle: '',
  options: [
    { id: 'enfants', label: 'Enfants', icon: '👶' },
    { id: 'jeunes', label: 'Jeunes (18-30)', icon: '🧑' },
    { id: 'adultes', label: 'Adultes (30-50)', icon: '🧔' },
    { id: 'seniors', label: 'Seniors (50+)', icon: '👴' },
    { id: 'mix', label: 'Ages melanges', icon: '👨‍👩‍👧' },
  ],
}

export const HERO_Q_PEOPLE_ORIGIN: HeroQuestion = {
  id: 'people_origin',
  title: 'Quelle apparence ?',
  subtitle: 'Pour que l\'image te ressemble',
  options: [
    { id: 'antillaise', label: 'Antillaise / Caribbeenne', icon: '🌺' },
    { id: 'africaine', label: 'Africaine', icon: '🌍' },
    { id: 'europeenne', label: 'Europeenne', icon: '🏔️' },
    { id: 'asiatique', label: 'Asiatique', icon: '🏯' },
    { id: 'mixte', label: 'Mixte / Diverse', icon: '🌈' },
  ],
}

export const HERO_Q_PEOPLE_ACTION: HeroQuestion = {
  id: 'people_action',
  title: 'Que font-ils ?',
  subtitle: '',
  options: [
    { id: 'sourient', label: 'Sourient / Posent', icon: '😊' },
    { id: 'mangent', label: 'Mangent / Boivent', icon: '🍴' },
    { id: 'travaillent', label: 'Travaillent', icon: '💼' },
    { id: 'discutent', label: 'Discutent', icon: '💬' },
    { id: 'dansent', label: 'Dansent / Font la fete', icon: '💃' },
    { id: 'cuisinent', label: 'Cuisinent', icon: '👨‍🍳' },
  ],
}

export const HERO_Q_PEOPLE_CLOTHING: HeroQuestion = {
  id: 'people_clothing',
  title: 'Comment sont-ils habilles ?',
  subtitle: '',
  options: [
    { id: 'decontracte', label: 'Decontracte', icon: '👕' },
    { id: 'elegant', label: 'Elegant / Chic', icon: '👔' },
    { id: 'professionnel', label: 'Tenue pro / Uniforme', icon: '👨‍🍳' },
    { id: 'traditionnel', label: 'Tenue traditionnelle', icon: '👗' },
  ],
}

// ====== COMMERCE ======
export const HERO_Q_COMMERCE_VIEW: HeroQuestion = {
  id: 'commerce_view',
  title: 'Quelle vue de ton commerce ?',
  subtitle: '',
  options: [
    { id: 'devanture', label: 'La devanture / facade', icon: '🏠' },
    { id: 'interieur', label: 'L\'interieur / la salle', icon: '🛋️' },
    { id: 'comptoir', label: 'Le comptoir / bar', icon: '🍸' },
    { id: 'cuisine', label: 'La cuisine / atelier', icon: '🔥' },
    { id: 'terrasse', label: 'La terrasse', icon: '☀️' },
  ],
}

// ====== PRODUITS ======
export const HERO_Q_PRODUCT_TYPE: HeroQuestion = {
  id: 'product_type',
  title: 'Quel type de produits ?',
  subtitle: '',
  options: [
    { id: 'plats_creoles', label: 'Plats creoles', icon: '🍛' },
    { id: 'patisseries', label: 'Patisseries / Desserts', icon: '🧁' },
    { id: 'boissons', label: 'Boissons / Cocktails', icon: '🍹' },
    { id: 'fruits', label: 'Fruits tropicaux', icon: '🥭' },
    { id: 'cosmetiques', label: 'Cosmetiques / Soins', icon: '🧴' },
    { id: 'artisanat', label: 'Artisanat / Bijoux', icon: '💍' },
    { id: 'vetements', label: 'Vetements / Mode', icon: '👗' },
  ],
}

export const HERO_Q_PRODUCT_PRESENTATION: HeroQuestion = {
  id: 'product_presentation',
  title: 'Quelle mise en scene ?',
  subtitle: '',
  options: [
    { id: 'gros_plan', label: 'Gros plan (focus produit)', icon: '🔍' },
    { id: 'table_dressee', label: 'Table dressee', icon: '🍽️' },
    { id: 'etalage', label: 'Etalage / Vitrine', icon: '🏬' },
    { id: 'en_preparation', label: 'En preparation', icon: '👨‍🍳' },
    { id: 'dans_les_mains', label: 'Tenu dans les mains', icon: '🤲' },
  ],
}

// ====== PAYSAGE ======
export const HERO_Q_LANDSCAPE_TYPE: HeroQuestion = {
  id: 'landscape_type',
  title: 'Quel type de paysage ?',
  subtitle: '',
  options: [
    { id: 'plage', label: 'Plage / Bord de mer', icon: '🏖️' },
    { id: 'montagne', label: 'Montagne / Volcan', icon: '🏔️' },
    { id: 'foret', label: 'Foret tropicale', icon: '🌿' },
    { id: 'ville', label: 'Ville / Rue', icon: '🏙️' },
    { id: 'campagne', label: 'Campagne / Champs', icon: '🌾' },
    { id: 'port', label: 'Port / Marina', icon: '⛵' },
  ],
}

// ====== UNIVERSELS ======
export const HERO_Q_AMBIANCE: HeroQuestion = {
  id: 'ambiance',
  title: 'Quelle ambiance ?',
  subtitle: 'L\'emotion que ton client doit ressentir',
  options: [
    { id: 'chaleureuse', label: 'Chaleureuse & Familiale', icon: '🤗' },
    { id: 'festive', label: 'Festive & Coloree', icon: '🎊' },
    { id: 'zen', label: 'Zen & Apaisante', icon: '🧘' },
    { id: 'luxe', label: 'Chic & Raffinee', icon: '💎' },
    { id: 'dynamique', label: 'Dynamique & Energique', icon: '⚡' },
    { id: 'romantique', label: 'Romantique & Douce', icon: '🌹' },
    { id: 'futuriste', label: 'Futuriste & Tech', icon: '🚀' },
    { id: 'mysterieuse', label: 'Mysterieuse & Sombre', icon: '🌑' },
  ],
}

export const HERO_Q_LUMIERE: HeroQuestion = {
  id: 'lumiere',
  title: 'Quelle lumiere ?',
  subtitle: 'Le moment et le type d\'eclairage',
  options: [
    { id: 'matin', label: 'Matin lumineux', icon: '🌅' },
    { id: 'apres_midi', label: 'Plein soleil', icon: '☀️' },
    { id: 'golden_hour', label: 'Coucher de soleil', icon: '🌇' },
    { id: 'nuit', label: 'Nuit / Neons', icon: '🌙' },
    { id: 'tamisee', label: 'Tamisee / Intime', icon: '🕯️' },
    { id: 'studio', label: 'Eclairage studio', icon: '💡' },
    { id: 'dramatique', label: 'Dramatique / Contrastee', icon: '🎭' },
  ],
}

export const HERO_Q_COULEURS: HeroQuestion = {
  id: 'couleurs',
  title: 'Quelles couleurs dominantes ?',
  subtitle: '',
  options: [
    { id: 'chauds', label: 'Tons chauds (rouge, orange, jaune)', icon: '🔥' },
    { id: 'froids', label: 'Tons froids (bleu, vert)', icon: '🧊' },
    { id: 'vifs', label: 'Vifs & Colores', icon: '🎨' },
    { id: 'pastels', label: 'Pastels & Doux', icon: '🌸' },
    { id: 'naturels', label: 'Naturels (bois, terre, vert)', icon: '🌿' },
    { id: 'sombres', label: 'Sombres & Contrastes', icon: '🖤' },
    { id: 'neon', label: 'Neon / Electrique', icon: '💜' },
    { id: 'noir_et_or', label: 'Noir & Or', icon: '✨' },
  ],
}

export const HERO_Q_LIEU: HeroQuestion = {
  id: 'lieu',
  title: 'Quel decor / arriere-plan ?',
  subtitle: '',
  options: [
    { id: 'interieur', label: 'Interieur', icon: '🏠' },
    { id: 'terrasse', label: 'Terrasse', icon: '☂️' },
    { id: 'plage', label: 'Plage', icon: '🏖️' },
    { id: 'rue', label: 'Rue animee', icon: '🛤️' },
    { id: 'marche', label: 'Marche', icon: '🧺' },
    { id: 'nature', label: 'Nature / Vegetation', icon: '🌺' },
    { id: 'abstrait', label: 'Fond abstrait / Uni', icon: '🌀' },
    { id: 'aucun', label: 'Pas d\'arriere-plan', icon: '⬜' },
  ],
}

export const HERO_Q_ELEMENTS: HeroQuestion = {
  id: 'elements',
  title: 'Des elements en plus ?',
  subtitle: 'Tu peux en choisir plusieurs',
  multiSelect: true,
  options: [
    { id: 'vegetation', label: 'Vegetation tropicale', icon: '🌴' },
    { id: 'fleurs', label: 'Fleurs', icon: '🌺' },
    { id: 'fruits', label: 'Fruits tropicaux', icon: '🍍' },
    { id: 'mer', label: 'Mer / Ocean', icon: '🌊' },
    { id: 'architecture', label: 'Architecture creole', icon: '🏡' },
    { id: 'bougies', label: 'Bougies / Lumieres', icon: '🕯️' },
    { id: 'musique', label: 'Instruments / Musique', icon: '🎶' },
    { id: 'technologie', label: 'Technologie / Digital', icon: '💻' },
    { id: 'particules', label: 'Particules / Effets lumineux', icon: '✨' },
    { id: 'fumee', label: 'Fumee / Brume', icon: '🌫️' },
  ],
}
