export interface MenuTemplate {
  id: string
  name: string
  description: string
  // Colors
  bgColor: string
  textColor: string
  accentColor: string
  priceColor: string
  categoryColor: string
  borderColor: string
  // Fonts
  titleFont: string
  bodyFont: string
  // Layout
  headerBg: string
  categoryBg: string
  itemBorder: string
  // Preview colors for thumbnail
  previewBg: string
  previewAccent: string
  // AI background prompt for fal.ai
  aiPrompt: string
}

export const MENU_TEMPLATES: MenuTemplate[] = [
  {
    id: 'tropical_elegant',
    name: 'Tropical Elegant',
    description: 'Feuilles tropicales, police serif, bordures dorees',
    bgColor: '#FFFDF5',
    textColor: '#1A3C2A',
    accentColor: '#C5993A',
    priceColor: '#C5993A',
    categoryColor: '#1A3C2A',
    borderColor: '#C5993A',
    titleFont: 'Georgia, "Times New Roman", serif',
    bodyFont: 'Georgia, "Times New Roman", serif',
    headerBg: 'linear-gradient(135deg, #1A3C2A 0%, #2D5A3F 100%)',
    categoryBg: '#F5F0E1',
    itemBorder: '1px dashed #C5993A',
    previewBg: 'bg-gradient-to-br from-green-900 to-green-800',
    previewAccent: 'text-yellow-400',
    aiPrompt: 'Elegant tropical restaurant menu background, lush palm leaves and golden botanical ornaments on rich dark green, soft warm lighting, luxury dining atmosphere, subtle gold leaf accents and foliage borders, watercolor style, no text no letters no words',
  },
  {
    id: 'street_food',
    name: 'Street Food',
    description: 'Bold, urbain, couleurs vives',
    bgColor: '#1A1A1A',
    textColor: '#FFFFFF',
    accentColor: '#FFD700',
    priceColor: '#FF4444',
    categoryColor: '#FFD700',
    borderColor: '#FF4444',
    titleFont: '"Impact", "Arial Black", sans-serif',
    bodyFont: '"Helvetica Neue", Arial, sans-serif',
    headerBg: 'linear-gradient(135deg, #FF4444 0%, #CC0000 100%)',
    categoryBg: '#2A2A2A',
    itemBorder: '1px solid #333333',
    previewBg: 'bg-gradient-to-br from-red-600 to-yellow-500',
    previewAccent: 'text-black',
    aiPrompt: 'Vibrant street food menu background, bold colorful graffiti wall texture with neon light accents, urban food truck aesthetic, warm amber and cool cyan lighting, energetic mood, concrete texture, no text no letters no words',
  },
  {
    id: 'moderne_epure',
    name: 'Moderne Epure',
    description: 'Minimaliste, beaucoup de blanc, typo fine',
    bgColor: '#FFFFFF',
    textColor: '#1A1A1A',
    accentColor: '#666666',
    priceColor: '#1A1A1A',
    categoryColor: '#999999',
    borderColor: '#E5E5E5',
    titleFont: '"Helvetica Neue", "Segoe UI", sans-serif',
    bodyFont: '"Helvetica Neue", "Segoe UI", sans-serif',
    headerBg: '#FFFFFF',
    categoryBg: '#FAFAFA',
    itemBorder: '1px solid #F0F0F0',
    previewBg: 'bg-gradient-to-br from-gray-100 to-white',
    previewAccent: 'text-gray-800',
    aiPrompt: 'Minimalist clean restaurant menu background, soft white marble texture with subtle grey geometric patterns, elegant negative space, modern fine dining aesthetic, minimal and refined, light and airy, no text no letters no words',
  },
  {
    id: 'creole_authentique',
    name: 'Creole Authentique',
    description: 'Couleurs chaudes, ambiance Guadeloupe',
    bgColor: '#FFF8F0',
    textColor: '#3D1C00',
    accentColor: '#D4380D',
    priceColor: '#D4380D',
    categoryColor: '#3D1C00',
    borderColor: '#E8B84B',
    titleFont: '"Brush Script MT", "Comic Sans MS", cursive',
    bodyFont: 'Georgia, "Times New Roman", serif',
    headerBg: 'linear-gradient(135deg, #D4380D 0%, #B8860B 50%, #228B22 100%)',
    categoryBg: '#FFF0DB',
    itemBorder: '1px dashed #E8B84B',
    previewBg: 'bg-gradient-to-br from-red-600 via-yellow-500 to-green-600',
    previewAccent: 'text-white',
    aiPrompt: 'Caribbean creole restaurant menu background, warm tropical wood texture with colorful madras fabric pattern accents, hibiscus flowers, authentic Caribbean kitchen atmosphere, warm golden light, Guadeloupe vibes, no text no letters no words',
  },
  {
    id: 'cocktail_bar',
    name: 'Cocktail Bar',
    description: 'Sombre, neon, ambiance nocturne',
    bgColor: '#0A0A0F',
    textColor: '#E0E0E0',
    accentColor: '#FF6EB4',
    priceColor: '#00D4FF',
    categoryColor: '#FF6EB4',
    borderColor: '#1A1A2E',
    titleFont: '"Helvetica Neue", Arial, sans-serif',
    bodyFont: '"Helvetica Neue", Arial, sans-serif',
    headerBg: 'linear-gradient(135deg, #0A0A0F 0%, #1A1A2E 100%)',
    categoryBg: '#111122',
    itemBorder: '1px solid #1A1A2E',
    previewBg: 'bg-gradient-to-br from-purple-900 to-pink-600',
    previewAccent: 'text-cyan-400',
    aiPrompt: 'Dark moody cocktail bar menu background, deep navy and black with glowing neon pink and blue light accents, bokeh lights, elegant glass reflections, nightlife ambiance, smoky atmosphere, no text no letters no words',
  },
  {
    id: 'traiteur_premium',
    name: 'Traiteur Premium',
    description: 'Luxe, serif, espacement genereux',
    bgColor: '#FFFFF5',
    textColor: '#2C1810',
    accentColor: '#8B0000',
    priceColor: '#8B0000',
    categoryColor: '#8B0000',
    borderColor: '#C5993A',
    titleFont: 'Georgia, "Times New Roman", serif',
    bodyFont: 'Georgia, "Times New Roman", serif',
    headerBg: 'linear-gradient(135deg, #8B0000 0%, #6B0000 100%)',
    categoryBg: '#FDF5E6',
    itemBorder: '1px solid #E8D5B7',
    previewBg: 'bg-gradient-to-br from-red-900 to-red-800',
    previewAccent: 'text-yellow-300',
    aiPrompt: 'Luxury catering service menu background, rich burgundy and gold ornamental borders on ivory parchment texture, classic French gastronomy aesthetic, gold foil accents, premium and sophisticated, damask pattern, no text no letters no words',
  },
]

export function getTemplate(id: string): MenuTemplate {
  return MENU_TEMPLATES.find(t => t.id === id) || MENU_TEMPLATES[0]
}
