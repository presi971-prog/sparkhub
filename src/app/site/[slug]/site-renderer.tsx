'use client'

import { useEffect, useRef, useState } from 'react'
import { Phone, Mail, MapPin, Clock, Facebook, Instagram, MessageCircle, ChevronDown, Star, ArrowUpRight } from 'lucide-react'

// --- Types ---

interface ServiceItem {
  name: string
  price: string
  description?: string
}

interface SiteData {
  business_name: string
  business_type: string | null
  slogan: string | null
  logo_url: string | null
  services: ServiceItem[]
  phone: string | null
  email: string | null
  address: string | null
  opening_hours: Record<string, string>
  gallery_urls: string[]
  facebook_url: string | null
  instagram_url: string | null
  tiktok_url: string | null
  youtube_url: string | null
  whatsapp_number: string | null
  theme: string
  accent_color: string
  font_style: string
  services_layout: string
  sections_order: string[]
  ai_description: string | null
  hero_image_url: string | null
}

// --- Theme definitions ---

interface ThemeConfig {
  bgColor: string
  bgAlt: string
  textColor: string
  mutedColor: string
  cardBg: string
  cardBorder: string
  footerBg: string
  footerText: string
  headerBg: string
  isDark: boolean
  decorPattern: string
}

const THEMES: Record<string, ThemeConfig> = {
  tropical_creole: {
    bgColor: '#FDF6EC', bgAlt: '#F7EDDF', textColor: '#2C1810', mutedColor: '#7A6652',
    cardBg: '#FFFFFF', cardBorder: '#E8D5B7', footerBg: '#1C1008', footerText: '#C4A882',
    headerBg: 'linear-gradient(135deg, #D4380D 0%, #B8860B 50%, #228B22 100%)',
    isDark: false, decorPattern: 'radial-gradient(circle at 20% 50%, rgba(212,56,13,0.05) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(34,139,34,0.05) 0%, transparent 50%)',
  },
  moderne_epure: {
    bgColor: '#FAFAFA', bgAlt: '#F3F4F6', textColor: '#111827', mutedColor: '#6B7280',
    cardBg: '#FFFFFF', cardBorder: '#E5E7EB', footerBg: '#111827', footerText: '#9CA3AF',
    headerBg: 'linear-gradient(135deg, #1F2937 0%, #374151 100%)',
    isDark: false, decorPattern: 'linear-gradient(135deg, rgba(0,0,0,0.01) 25%, transparent 25%, transparent 50%, rgba(0,0,0,0.01) 50%, rgba(0,0,0,0.01) 75%, transparent 75%)',
  },
  nuit_electrique: {
    bgColor: '#080810', bgAlt: '#0E0E1A', textColor: '#E8E8F0', mutedColor: '#8888AA',
    cardBg: '#12122A', cardBorder: '#2A2A50', footerBg: '#04040A', footerText: '#666688',
    headerBg: 'linear-gradient(135deg, #0A0A1A 0%, #1A0A2E 50%, #0A1A2E 100%)',
    isDark: true, decorPattern: 'radial-gradient(ellipse at 20% 0%, rgba(139,92,246,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(236,72,153,0.08) 0%, transparent 50%)',
  },
  nature_zen: {
    bgColor: '#F2F7F2', bgAlt: '#E8F0E8', textColor: '#1A3C2A', mutedColor: '#5A7A6A',
    cardBg: '#FFFFFF', cardBorder: '#C8DCC8', footerBg: '#142A1C', footerText: '#8AAC8A',
    headerBg: 'linear-gradient(135deg, #1A4A2E 0%, #2A6A40 100%)',
    isDark: false, decorPattern: 'radial-gradient(circle at 10% 20%, rgba(45,90,63,0.04) 0%, transparent 50%), radial-gradient(circle at 90% 70%, rgba(59,122,87,0.04) 0%, transparent 50%)',
  },
  street_urban: {
    bgColor: '#141414', bgAlt: '#1A1A1A', textColor: '#F0F0F0', mutedColor: '#999999',
    cardBg: '#1E1E1E', cardBorder: '#333333', footerBg: '#0A0A0A', footerText: '#777777',
    headerBg: 'linear-gradient(135deg, #1A1A1A 0%, #0A0A0A 100%)',
    isDark: true, decorPattern: 'repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(255,255,255,0.01) 40px, rgba(255,255,255,0.01) 80px)',
  },
  premium_or: {
    bgColor: '#FDFBF5', bgAlt: '#F8F3E8', textColor: '#1C1008', mutedColor: '#8B7355',
    cardBg: '#FFFDF5', cardBorder: '#D4B078', footerBg: '#1C1008', footerText: '#B8956A',
    headerBg: 'linear-gradient(135deg, #6B0000 0%, #8B0000 40%, #4A0000 100%)',
    isDark: false, decorPattern: 'radial-gradient(circle at 50% 0%, rgba(196,153,58,0.06) 0%, transparent 50%), radial-gradient(circle at 50% 100%, rgba(139,0,0,0.04) 0%, transparent 50%)',
  },
}

const FONTS: Record<string, { title: string; body: string; import: string }> = {
  moderne: { title: "'DM Sans', sans-serif", body: "'DM Sans', sans-serif", import: 'DM+Sans:wght@400;500;600;700' },
  elegant: { title: "'Playfair Display', serif", body: "'Source Serif 4', serif", import: 'Playfair+Display:wght@400;500;600;700;800|Source+Serif+4:wght@400;500;600' },
  fun: { title: "'Quicksand', sans-serif", body: "'Quicksand', sans-serif", import: 'Quicksand:wght@400;500;600;700' },
}

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

// --- Utility: color manipulation ---

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 230, g: 126, b: 34 }
}

function accentWithAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r},${g},${b},${alpha})`
}

// --- Scroll-reveal hook ---

function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.unobserve(el) } },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, visible }
}

function RevealSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useReveal()
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(32px)',
        transition: `opacity 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

// --- Gallery lightbox ---

function GalleryLightbox({ images, activeIndex, onClose }: { images: string[]; activeIndex: number; onClose: () => void }) {
  const [current, setCurrent] = useState(activeIndex)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setCurrent(c => (c + 1) % images.length)
      if (e.key === 'ArrowLeft') setCurrent(c => (c - 1 + images.length) % images.length)
    }
    window.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', handleKey); document.body.style.overflow = '' }
  }, [images.length, onClose])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
      <button onClick={onClose} className="absolute top-6 right-6 z-10 text-white/70 hover:text-white text-3xl font-light">&#x2715;</button>
      <div className="relative z-10 max-w-[90vw] max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <img src={images[current]} alt="" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />
      </div>
      {images.length > 1 && (
        <>
          <button onClick={e => { e.stopPropagation(); setCurrent(c => (c - 1 + images.length) % images.length) }}
            className="absolute left-4 z-10 text-white/60 hover:text-white text-4xl font-light">&#8249;</button>
          <button onClick={e => { e.stopPropagation(); setCurrent(c => (c + 1) % images.length) }}
            className="absolute right-4 z-10 text-white/60 hover:text-white text-4xl font-light">&#8250;</button>
          <div className="absolute bottom-6 z-10 flex gap-2">
            {images.map((_, i) => (
              <button key={i} onClick={e => { e.stopPropagation(); setCurrent(i) }}
                className="w-2 h-2 rounded-full transition-all" style={{ backgroundColor: i === current ? '#fff' : 'rgba(255,255,255,0.3)' }} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// =============================================
// MAIN RENDERER
// =============================================

export function SiteRenderer({ site }: { site: SiteData }) {
  const t = THEMES[site.theme] || THEMES.tropical_creole
  const f = FONTS[site.font_style] || FONTS.moderne
  const accent = site.accent_color || '#E67E22'

  const sectionsOrder = site.sections_order || ['hero', 'about', 'services', 'gallery', 'hours', 'contact', 'social']

  const sectionComponents: Record<string, React.ReactNode> = {
    hero: <HeroSection key="hero" site={site} t={t} accent={accent} f={f} />,
    about: site.ai_description ? <AboutSection key="about" site={site} t={t} accent={accent} f={f} /> : null,
    services: site.services?.length > 0 ? <ServicesSection key="services" site={site} t={t} accent={accent} f={f} /> : null,
    gallery: site.gallery_urls?.length > 0 ? <GallerySection key="gallery" site={site} t={t} accent={accent} f={f} /> : null,
    hours: Object.keys(site.opening_hours || {}).length > 0 ? <HoursSection key="hours" site={site} t={t} accent={accent} f={f} /> : null,
    contact: (site.phone || site.email || site.address) ? <ContactSection key="contact" site={site} t={t} accent={accent} f={f} /> : null,
    social: (site.facebook_url || site.instagram_url || site.tiktok_url || site.youtube_url) ? <SocialSection key="social" site={site} t={t} accent={accent} f={f} /> : null,
  }

  const whatsappUrl = site.whatsapp_number
    ? `https://wa.me/${site.whatsapp_number.replace(/\D/g, '')}`
    : null

  return (
    <>
      <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?family=${f.import}&display=swap`} />

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; }
        html { scroll-behavior: smooth; }
        body { overflow-x: hidden; }
        .site-section-divider {
          height: 1px;
          max-width: 120px;
          margin: 0 auto;
          background: ${accentWithAlpha(accent, 0.3)};
        }
        .accent-bar { width: 48px; height: 3px; border-radius: 2px; background: ${accent}; }
        .card-hover { transition: transform 0.35s cubic-bezier(0.22,1,0.36,1), box-shadow 0.35s ease; }
        .card-hover:hover { transform: translateY(-4px); box-shadow: 0 20px 40px ${accentWithAlpha(accent, 0.12)}; }
        .gallery-item { transition: transform 0.4s cubic-bezier(0.22,1,0.36,1); }
        .gallery-item:hover { transform: scale(1.03); z-index: 2; }
        .whatsapp-pulse { animation: wa-pulse 2s infinite; }
        @keyframes wa-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(37,211,102,0.5); }
          50% { box-shadow: 0 0 0 12px rgba(37,211,102,0); }
        }
        .hero-scroll-hint { animation: scroll-bounce 2s ease-in-out infinite; }
        @keyframes scroll-bounce {
          0%, 100% { transform: translateY(0); opacity: 0.6; }
          50% { transform: translateY(8px); opacity: 1; }
        }
      `}</style>

      <div style={{ backgroundColor: t.bgColor, color: t.textColor, fontFamily: f.body, minHeight: '100vh' }}>
        {/* Background pattern */}
        <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage: t.decorPattern }} />

        <div className="relative">
          {sectionsOrder.map(sectionId => sectionComponents[sectionId])}
        </div>

        {/* Footer */}
        <footer style={{ backgroundColor: t.footerBg, color: t.footerText }} className="relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `radial-gradient(${accent} 1px, transparent 1px)`, backgroundSize: '20px 20px' }} />
          <div className="relative px-6 py-12">
            <div className="max-w-4xl mx-auto text-center">
              {site.logo_url && (
                <img src={site.logo_url} alt={site.business_name} className="h-12 w-12 rounded-full object-cover mx-auto mb-4 opacity-60" />
              )}
              <p className="text-lg font-semibold mb-1" style={{ fontFamily: f.title, color: t.footerText }}>
                {site.business_name}
              </p>
              {site.slogan && <p className="text-sm opacity-50 mb-6">{site.slogan}</p>}

              {/* Quick contact row */}
              <div className="flex flex-wrap items-center justify-center gap-4 mb-8 text-sm opacity-60">
                {site.phone && <a href={`tel:${site.phone}`} className="hover:opacity-100 transition-opacity flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{site.phone}</a>}
                {site.email && <a href={`mailto:${site.email}`} className="hover:opacity-100 transition-opacity flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{site.email}</a>}
                {site.address && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{site.address}</span>}
              </div>

              <div className="w-12 h-px mx-auto mb-4 opacity-20" style={{ backgroundColor: t.footerText }} />
              <p className="text-xs opacity-40">
                Site cree avec{' '}
                <a href="https://sparkhub.digital-code-growth.com" target="_blank" rel="noopener noreferrer"
                  className="underline hover:opacity-100 transition-opacity" style={{ color: accent }}>
                  SparkHub
                </a>
                {' '}— Outils IA pour les pros
              </p>
            </div>
          </div>
        </footer>

        {/* WhatsApp floating button */}
        {whatsappUrl && (
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
            className="fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full shadow-2xl whatsapp-pulse"
            style={{ backgroundColor: '#25D366' }} title="Nous contacter sur WhatsApp">
            <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </a>
        )}
      </div>
    </>
  )
}

// =============================================
// SECTIONS
// =============================================

type SectionProps = { site: SiteData; t: ThemeConfig; accent: string; f: (typeof FONTS)[string] }

// --- HERO ---

function HeroSection({ site, t, accent, f }: SectionProps) {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => { const timer = setTimeout(() => setLoaded(true), 100); return () => clearTimeout(timer) }, [])

  const hasContactInfo = site.phone || site.whatsapp_number

  return (
    <section className="relative min-h-[100svh] flex flex-col items-center justify-center overflow-hidden">
      {/* Background */}
      {site.hero_image_url ? (
        <>
          <img src={site.hero_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ transform: 'scale(1.05)' }} />
          <div className="absolute inset-0" style={{
            background: `linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.5) 70%, rgba(0,0,0,0.85) 100%)`
          }} />
          {/* Accent color overlay */}
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${accentWithAlpha(accent, 0.15)} 0%, transparent 60%)` }} />
        </>
      ) : (
        <>
          <div className="absolute inset-0" style={{ background: t.headerBg }} />
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `radial-gradient(circle at 30% 20%, ${accent} 0%, transparent 50%), radial-gradient(circle at 70% 80%, ${accent} 0%, transparent 50%)` }} />
        </>
      )}

      {/* Content */}
      <div className="relative z-10 text-center px-6 py-20 max-w-3xl mx-auto w-full">
        {/* Logo */}
        {site.logo_url && (
          <div style={{ opacity: loaded ? 1 : 0, transform: loaded ? 'scale(1)' : 'scale(0.8)', transition: 'all 0.6s cubic-bezier(0.22,1,0.36,1) 0.2s' }}>
            <div className="relative mx-auto mb-8 w-24 h-24">
              <div className="absolute inset-0 rounded-full" style={{ background: `linear-gradient(135deg, ${accent}, ${accentWithAlpha(accent, 0.6)})`, transform: 'scale(1.1)', filter: 'blur(16px)', opacity: 0.4 }} />
              <img src={site.logo_url} alt="Logo" className="relative h-24 w-24 rounded-full object-cover border-2" style={{ borderColor: 'rgba(255,255,255,0.3)' }} />
            </div>
          </div>
        )}

        {/* Business type badge */}
        {site.business_type && (
          <div style={{ opacity: loaded ? 1 : 0, transform: loaded ? 'translateY(0)' : 'translateY(16px)', transition: 'all 0.6s cubic-bezier(0.22,1,0.36,1) 0.3s' }}>
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase mb-6"
              style={{ backgroundColor: accentWithAlpha(accent, 0.2), color: '#fff', backdropFilter: 'blur(8px)', border: `1px solid ${accentWithAlpha(accent, 0.3)}` }}>
              {site.business_type}
            </span>
          </div>
        )}

        {/* Title */}
        <h1 style={{
          fontFamily: f.title, color: '#FFFFFF', fontSize: 'clamp(2.5rem, 8vw, 4.5rem)', fontWeight: 700,
          lineHeight: 1.05, letterSpacing: '-0.02em', textShadow: '0 4px 30px rgba(0,0,0,0.3)',
          opacity: loaded ? 1 : 0, transform: loaded ? 'translateY(0)' : 'translateY(24px)',
          transition: 'all 0.8s cubic-bezier(0.22,1,0.36,1) 0.4s',
        }}>
          {site.business_name}
        </h1>

        {/* Slogan */}
        {site.slogan && (
          <p style={{
            color: 'rgba(255,255,255,0.8)', fontSize: 'clamp(1rem, 3vw, 1.35rem)', lineHeight: 1.5, marginTop: '1rem',
            fontFamily: f.body, maxWidth: '36ch', marginLeft: 'auto', marginRight: 'auto',
            opacity: loaded ? 1 : 0, transform: loaded ? 'translateY(0)' : 'translateY(16px)',
            transition: 'all 0.7s cubic-bezier(0.22,1,0.36,1) 0.6s',
          }}>
            {site.slogan}
          </p>
        )}

        {/* CTA buttons */}
        {hasContactInfo && (
          <div className="flex flex-wrap justify-center gap-3 mt-10" style={{
            opacity: loaded ? 1 : 0, transform: loaded ? 'translateY(0)' : 'translateY(16px)',
            transition: 'all 0.6s cubic-bezier(0.22,1,0.36,1) 0.8s',
          }}>
            {site.whatsapp_number && (
              <a href={`https://wa.me/${site.whatsapp_number.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-white text-sm transition-transform hover:scale-105"
                style={{ backgroundColor: accent, boxShadow: `0 8px 24px ${accentWithAlpha(accent, 0.4)}` }}>
                <MessageCircle className="h-4 w-4" />Nous contacter
              </a>
            )}
            {site.phone && (
              <a href={`tel:${site.phone}`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-all hover:scale-105"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                <Phone className="h-4 w-4" />Appeler
              </a>
            )}
          </div>
        )}
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 hero-scroll-hint">
        <ChevronDown className="h-6 w-6 text-white/50" />
      </div>

      {/* Bottom gradient fade into page */}
      <div className="absolute bottom-0 left-0 right-0 h-32 z-[5]" style={{
        background: `linear-gradient(to bottom, transparent, ${t.bgColor})`
      }} />
    </section>
  )
}

// --- ABOUT ---

function AboutSection({ site, t, accent, f }: SectionProps) {
  return (
    <section className="relative py-20 sm:py-28 px-6" style={{ backgroundColor: t.bgColor }}>
      <RevealSection>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <div className="accent-bar mx-auto mb-5" />
            <h2 className="text-3xl sm:text-4xl font-bold" style={{ fontFamily: f.title, color: t.textColor }}>
              A propos
            </h2>
          </div>

          {/* Styled quote block */}
          <div className="relative">
            <div className="absolute -top-4 -left-2 text-6xl leading-none font-serif opacity-15" style={{ color: accent }}>&ldquo;</div>
            <div className="pl-6 border-l-2" style={{ borderColor: accentWithAlpha(accent, 0.3) }}>
              <div className="text-lg sm:text-xl leading-relaxed whitespace-pre-line" style={{ color: t.mutedColor, lineHeight: 1.8 }}>
                {site.ai_description}
              </div>
            </div>
          </div>
        </div>
      </RevealSection>
    </section>
  )
}

// --- SERVICES ---

function ServicesSection({ site, t, accent, f }: SectionProps) {
  const isCards = site.services_layout !== 'list'

  return (
    <section className="relative py-20 sm:py-28 px-6" style={{ backgroundColor: t.bgAlt }}>
      {/* Section top decoration */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${accentWithAlpha(accent, 0.2)}, transparent)` }} />

      <RevealSection>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="accent-bar mx-auto mb-5" />
            <h2 className="text-3xl sm:text-4xl font-bold mb-3" style={{ fontFamily: f.title, color: t.textColor }}>
              Nos offres
            </h2>
            <p className="text-sm" style={{ color: t.mutedColor }}>Decouvrez ce que nous proposons</p>
          </div>

          {isCards ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {site.services.map((service, i) => (
                <RevealSection key={i} delay={i * 80}>
                  <div className="card-hover rounded-2xl p-6 border relative overflow-hidden h-full"
                    style={{ borderColor: t.cardBorder, backgroundColor: t.cardBg }}>
                    {/* Accent top bar */}
                    <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: `linear-gradient(to right, ${accent}, ${accentWithAlpha(accent, 0.4)})` }} />

                    {/* Star icon */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                      style={{ backgroundColor: accentWithAlpha(accent, 0.1) }}>
                      <Star className="h-5 w-5" style={{ color: accent }} />
                    </div>

                    <h3 className="font-bold text-lg mb-1" style={{ fontFamily: f.title }}>
                      {service.name}
                    </h3>

                    {service.description && (
                      <p className="text-sm mb-4" style={{ color: t.mutedColor, lineHeight: 1.6 }}>
                        {service.description}
                      </p>
                    )}

                    {service.price && (
                      <div className="mt-auto pt-3 border-t" style={{ borderColor: t.cardBorder }}>
                        <span className="text-2xl font-bold" style={{ color: accent }}>{service.price}</span>
                      </div>
                    )}
                  </div>
                </RevealSection>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: t.cardBorder, backgroundColor: t.cardBg }}>
              {site.services.map((service, i) => (
                <div key={i} className="flex items-center justify-between px-6 py-5 transition-colors"
                  style={{ borderBottom: i < site.services.length - 1 ? `1px solid ${t.cardBorder}` : 'none' }}>
                  <div className="flex-1">
                    <span className="font-semibold text-base" style={{ fontFamily: f.title }}>{service.name}</span>
                    {service.description && (
                      <p className="text-sm mt-0.5" style={{ color: t.mutedColor }}>{service.description}</p>
                    )}
                  </div>
                  {service.price && (
                    <span className="font-bold text-xl whitespace-nowrap ml-6" style={{ color: accent }}>{service.price}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </RevealSection>
    </section>
  )
}

// --- GALLERY ---

function GallerySection({ site, t, accent, f }: SectionProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const count = site.gallery_urls.length
  // Adaptive grid: 1 photo = full width, 2 = side by side, 3+ = masonry-like
  const gridClass = count === 1
    ? 'grid-cols-1 max-w-2xl mx-auto'
    : count === 2
      ? 'grid-cols-2'
      : count <= 4
        ? 'grid-cols-2 sm:grid-cols-2'
        : 'grid-cols-2 sm:grid-cols-3'

  return (
    <section className="relative py-20 sm:py-28 px-6" style={{ backgroundColor: t.bgColor }}>
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${accentWithAlpha(accent, 0.2)}, transparent)` }} />

      <RevealSection>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="accent-bar mx-auto mb-5" />
            <h2 className="text-3xl sm:text-4xl font-bold" style={{ fontFamily: f.title, color: t.textColor }}>
              Galerie
            </h2>
          </div>

          <div className={`grid gap-3 sm:gap-4 ${gridClass}`}>
            {site.gallery_urls.map((url, i) => {
              // First image gets special tall treatment for 3+ images
              const isFeature = i === 0 && count >= 3
              return (
                <div key={i}
                  className={`gallery-item relative overflow-hidden rounded-2xl cursor-pointer group ${isFeature ? 'sm:row-span-2' : ''}`}
                  style={{ aspectRatio: isFeature ? undefined : '4/3' }}
                  onClick={() => setLightboxIndex(i)}>
                  <img src={url} alt={`${site.business_name} photo ${i + 1}`}
                    className="w-full h-full object-cover" style={isFeature ? { minHeight: '100%' } : {}} />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/20 backdrop-blur-sm rounded-full p-3">
                      <ArrowUpRight className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </RevealSection>

      {lightboxIndex !== null && (
        <GalleryLightbox images={site.gallery_urls} activeIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
    </section>
  )
}

// --- HOURS ---

function HoursSection({ site, t, accent, f }: SectionProps) {
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long' })
  const todayCapitalized = today.charAt(0).toUpperCase() + today.slice(1)

  return (
    <section className="relative py-20 sm:py-28 px-6" style={{ backgroundColor: t.bgAlt }}>
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${accentWithAlpha(accent, 0.2)}, transparent)` }} />

      <RevealSection>
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-10">
            <div className="accent-bar mx-auto mb-5" />
            <h2 className="text-3xl sm:text-4xl font-bold flex items-center justify-center gap-3" style={{ fontFamily: f.title, color: t.textColor }}>
              <Clock className="h-8 w-8" style={{ color: accent }} />
              Horaires
            </h2>
          </div>

          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: t.cardBorder, backgroundColor: t.cardBg }}>
            {DAYS.map((day, i) => {
              const hours = site.opening_hours[day]
              if (!hours) return null
              const isClosed = hours.toLowerCase().includes('ferm')
              const isToday = day === todayCapitalized

              return (
                <div key={day}
                  className="flex justify-between items-center px-6 py-4 transition-colors"
                  style={{
                    borderBottom: i < DAYS.length - 1 ? `1px solid ${t.cardBorder}` : 'none',
                    backgroundColor: isToday ? accentWithAlpha(accent, 0.06) : 'transparent',
                  }}>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold" style={{ color: isToday ? accent : t.textColor }}>
                      {day}
                    </span>
                    {isToday && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: accentWithAlpha(accent, 0.15), color: accent }}>
                        Aujourd&apos;hui
                      </span>
                    )}
                  </div>
                  <span className="font-medium" style={{ color: isClosed ? '#EF4444' : t.mutedColor }}>
                    {hours}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </RevealSection>
    </section>
  )
}

// --- CONTACT ---

function ContactSection({ site, t, accent, f }: SectionProps) {
  return (
    <section className="relative py-20 sm:py-28 px-6" style={{ backgroundColor: t.bgColor }}>
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${accentWithAlpha(accent, 0.2)}, transparent)` }} />

      <RevealSection>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <div className="accent-bar mx-auto mb-5" />
            <h2 className="text-3xl sm:text-4xl font-bold" style={{ fontFamily: f.title, color: t.textColor }}>
              Nous trouver
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {site.address && (
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.address)}`}
                target="_blank" rel="noopener noreferrer"
                className="card-hover rounded-2xl border p-6 text-center group"
                style={{ borderColor: t.cardBorder, backgroundColor: t.cardBg }}>
                <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ backgroundColor: accentWithAlpha(accent, 0.1) }}>
                  <MapPin className="h-5 w-5" style={{ color: accent }} />
                </div>
                <p className="text-sm font-medium mb-1">Adresse</p>
                <p className="text-sm" style={{ color: t.mutedColor }}>{site.address}</p>
              </a>
            )}

            {site.phone && (
              <a href={`tel:${site.phone}`}
                className="card-hover rounded-2xl border p-6 text-center group"
                style={{ borderColor: t.cardBorder, backgroundColor: t.cardBg }}>
                <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ backgroundColor: accentWithAlpha(accent, 0.1) }}>
                  <Phone className="h-5 w-5" style={{ color: accent }} />
                </div>
                <p className="text-sm font-medium mb-1">Telephone</p>
                <p className="text-sm" style={{ color: t.mutedColor }}>{site.phone}</p>
              </a>
            )}

            {site.email && (
              <a href={`mailto:${site.email}`}
                className="card-hover rounded-2xl border p-6 text-center group"
                style={{ borderColor: t.cardBorder, backgroundColor: t.cardBg }}>
                <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ backgroundColor: accentWithAlpha(accent, 0.1) }}>
                  <Mail className="h-5 w-5" style={{ color: accent }} />
                </div>
                <p className="text-sm font-medium mb-1">Email</p>
                <p className="text-sm" style={{ color: t.mutedColor }}>{site.email}</p>
              </a>
            )}
          </div>
        </div>
      </RevealSection>
    </section>
  )
}

// --- SOCIAL ---

function SocialSection({ site, t, accent, f }: SectionProps) {
  const links = [
    { url: site.facebook_url, label: 'Facebook', color: '#1877F2', icon: <Facebook className="h-5 w-5" /> },
    { url: site.instagram_url, label: 'Instagram', color: '#E4405F', icon: <Instagram className="h-5 w-5" /> },
    { url: site.tiktok_url, label: 'TikTok', color: t.isDark ? '#FFFFFF' : '#000000', icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.51a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.1a8.16 8.16 0 003.76.92V6.69z" /></svg> },
    { url: site.youtube_url, label: 'YouTube', color: '#FF0000', icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.19a3.02 3.02 0 00-2.12-2.14C19.54 3.5 12 3.5 12 3.5s-7.54 0-9.38.55A3.02 3.02 0 00.5 6.19 31.56 31.56 0 000 12a31.56 31.56 0 00.5 5.81 3.02 3.02 0 002.12 2.14c1.84.55 9.38.55 9.38.55s7.54 0 9.38-.55a3.02 3.02 0 002.12-2.14A31.56 31.56 0 0024 12a31.56 31.56 0 00-.5-5.81zM9.54 15.57V8.43L15.82 12l-6.28 3.57z" /></svg> },
  ].filter(l => l.url)

  return (
    <section className="relative py-20 sm:py-28 px-6" style={{ backgroundColor: t.bgAlt }}>
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${accentWithAlpha(accent, 0.2)}, transparent)` }} />

      <RevealSection>
        <div className="max-w-lg mx-auto text-center">
          <div className="accent-bar mx-auto mb-5" />
          <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ fontFamily: f.title, color: t.textColor }}>
            Suivez-nous
          </h2>
          <p className="text-sm mb-10" style={{ color: t.mutedColor }}>Restez connecte avec nous sur les reseaux</p>

          <div className="flex flex-col sm:flex-row justify-center gap-3">
            {links.map((link, i) => (
              <a key={i} href={link.url!} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-semibold text-white transition-all hover:scale-105 hover:shadow-lg text-sm"
                style={{ backgroundColor: link.color }}>
                {link.icon}
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </RevealSection>
    </section>
  )
}
