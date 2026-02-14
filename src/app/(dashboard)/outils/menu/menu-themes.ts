export interface MenuTheme {
  id: string
  name: string
  emoji: string
  // Decorations
  headerDecoration: string
  divider: string
  footerDecoration: string
  // Color overrides (optional)
  accentOverride?: string
  headerBgOverride?: string
  // Background CSS
  bgPattern?: string
}

export const MENU_THEMES: MenuTheme[] = [
  {
    id: 'aucun',
    name: 'Aucun',
    emoji: '',
    headerDecoration: '',
    divider: '',
    footerDecoration: '',
  },
  {
    id: 'noel',
    name: 'Noel',
    emoji: '🎄',
    headerDecoration: '🎄 ❄️ ⭐ ❄️ 🎄',
    divider: '❄️ ❄️ ❄️',
    footerDecoration: '🎁 Joyeux Noel ! 🎁',
    accentOverride: '#C41E3A',
    headerBgOverride: 'linear-gradient(135deg, #1B5E20 0%, #C41E3A 100%)',
    bgPattern: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.05) 1px, transparent 1px), radial-gradient(circle at 80% 60%, rgba(255,255,255,0.05) 1px, transparent 1px)',
  },
  {
    id: 'nouvel_an',
    name: 'Jour de l\'An',
    emoji: '🎆',
    headerDecoration: '✨ 🥂 🎆 🥂 ✨',
    divider: '✨ ✨ ✨',
    footerDecoration: '🎉 Bonne Annee ! 🎉',
    accentOverride: '#FFD700',
    headerBgOverride: 'linear-gradient(135deg, #0D1B2A 0%, #1B2D4F 50%, #2A1B4F 100%)',
    bgPattern: 'radial-gradient(circle at 30% 30%, rgba(255,215,0,0.03) 2px, transparent 2px), radial-gradient(circle at 70% 70%, rgba(255,215,0,0.03) 2px, transparent 2px)',
  },
  {
    id: 'carnaval',
    name: 'Carnaval',
    emoji: '🎭',
    headerDecoration: '🎭 🎊 💃 🎊 🎭',
    divider: '🎊 🎉 🎊',
    footerDecoration: '💃 Vive le Carnaval ! 🕺',
    accentOverride: '#FF6F00',
    headerBgOverride: 'linear-gradient(135deg, #E91E63 0%, #FF9800 33%, #4CAF50 66%, #2196F3 100%)',
  },
  {
    id: 'paques',
    name: 'Paques',
    emoji: '🐣',
    headerDecoration: '🌷 🐣 🥚 🐣 🌷',
    divider: '🌸 🌸 🌸',
    footerDecoration: '🐰 Joyeuses Paques ! 🐰',
    accentOverride: '#AB47BC',
    headerBgOverride: 'linear-gradient(135deg, #F8BBD0 0%, #E1BEE7 50%, #B2EBF2 100%)',
  },
  {
    id: 'saint_valentin',
    name: 'Saint-Valentin',
    emoji: '❤️',
    headerDecoration: '💕 🌹 ❤️ 🌹 💕',
    divider: '❤️ ❤️ ❤️',
    footerDecoration: '💝 Bonne Saint-Valentin 💝',
    accentOverride: '#E91E63',
    headerBgOverride: 'linear-gradient(135deg, #880E4F 0%, #C2185B 50%, #E91E63 100%)',
  },
  {
    id: 'fete_meres',
    name: 'Fete des Meres',
    emoji: '💐',
    headerDecoration: '🌺 💐 🌸 💐 🌺',
    divider: '🌺 🌸 🌺',
    footerDecoration: '💖 Bonne Fete Maman ! 💖',
    accentOverride: '#EC407A',
    headerBgOverride: 'linear-gradient(135deg, #FCE4EC 0%, #F48FB1 50%, #EC407A 100%)',
  },
  {
    id: 'halloween',
    name: 'Halloween',
    emoji: '🎃',
    headerDecoration: '🎃 👻 🦇 👻 🎃',
    divider: '🕸️ 🕷️ 🕸️',
    footerDecoration: '🎃 Happy Halloween ! 👻',
    accentOverride: '#FF6F00',
    headerBgOverride: 'linear-gradient(135deg, #1A1A1A 0%, #4A1A00 50%, #1A1A1A 100%)',
  },
]

export function getTheme(id: string): MenuTheme {
  return MENU_THEMES.find(t => t.id === id) || MENU_THEMES[0]
}

// Formats d'export
export interface ExportFormat {
  id: string
  name: string
  description: string
  width: number
  height: number | 'auto'
  icon: string
}

export const EXPORT_FORMATS: ExportFormat[] = [
  {
    id: 'a4',
    name: 'Impression A4',
    description: 'PDF pret a imprimer',
    width: 794, // A4 at 96dpi
    height: 'auto',
    icon: '🖨️',
  },
  {
    id: 'instagram_post',
    name: 'Instagram Post',
    description: '1080 x 1080 (carre)',
    width: 1080,
    height: 1080,
    icon: '📱',
  },
  {
    id: 'instagram_story',
    name: 'Instagram Story',
    description: '1080 x 1920 (vertical)',
    width: 1080,
    height: 1920,
    icon: '📲',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    description: '1200 x 630 (paysage)',
    width: 1200,
    height: 630,
    icon: '💻',
  },
]
