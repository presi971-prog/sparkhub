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
