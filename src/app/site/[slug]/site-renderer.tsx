'use client'

import { Phone, Mail, MapPin, Clock, Facebook, Instagram, MessageCircle } from 'lucide-react'

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

// --- Theme config (inline pour eviter import serveur) ---

const THEMES: Record<string, {
  bgColor: string; textColor: string; mutedColor: string
  cardBg: string; cardBorder: string; footerBg: string; footerText: string
  headerBg: string
}> = {
  tropical_creole: {
    bgColor: '#FFF8F0', textColor: '#2C1810', mutedColor: '#8B7355',
    cardBg: '#FFFFFF', cardBorder: '#E8B84B', footerBg: '#2C1810', footerText: '#F5E6D3',
    headerBg: 'linear-gradient(135deg, #D4380D 0%, #B8860B 50%, #228B22 100%)',
  },
  moderne_epure: {
    bgColor: '#FFFFFF', textColor: '#1A1A1A', mutedColor: '#6B7280',
    cardBg: '#F9FAFB', cardBorder: '#E5E7EB', footerBg: '#111827', footerText: '#D1D5DB',
    headerBg: '#FFFFFF',
  },
  nuit_electrique: {
    bgColor: '#0A0A0F', textColor: '#E0E0E0', mutedColor: '#9CA3AF',
    cardBg: '#111122', cardBorder: '#1E1E3F', footerBg: '#050510', footerText: '#9CA3AF',
    headerBg: 'linear-gradient(135deg, #0A0A0F 0%, #1A1A2E 100%)',
  },
  nature_zen: {
    bgColor: '#F0F7F0', textColor: '#1A3C2A', mutedColor: '#5F8570',
    cardBg: '#FFFFFF', cardBorder: '#B8D4C8', footerBg: '#1A3C2A', footerText: '#B8D4C8',
    headerBg: 'linear-gradient(135deg, #2D5A3F 0%, #3B7A57 100%)',
  },
  street_urban: {
    bgColor: '#1A1A1A', textColor: '#FFFFFF', mutedColor: '#9CA3AF',
    cardBg: '#2A2A2A', cardBorder: '#3A3A3A', footerBg: '#0A0A0A', footerText: '#9CA3AF',
    headerBg: 'linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%)',
  },
  premium_or: {
    bgColor: '#FFFFF5', textColor: '#2C1810', mutedColor: '#8B7355',
    cardBg: '#FFFDF5', cardBorder: '#C5993A', footerBg: '#2C1810', footerText: '#D4B896',
    headerBg: 'linear-gradient(135deg, #8B0000 0%, #6B0000 100%)',
  },
}

const FONTS: Record<string, { title: string; body: string; import: string }> = {
  moderne: {
    title: "'Inter', sans-serif",
    body: "'Inter', sans-serif",
    import: 'Inter:wght@400;500;600;700',
  },
  elegant: {
    title: "'Playfair Display', serif",
    body: "'Lora', serif",
    import: 'Playfair+Display:wght@400;500;600;700|Lora:wght@400;500;600;700',
  },
  fun: {
    title: "'Nunito', sans-serif",
    body: "'Nunito', sans-serif",
    import: 'Nunito:wght@400;500;600;700',
  },
}

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

// --- Component ---

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
      {/* Google Fonts */}
      <link
        rel="stylesheet"
        href={`https://fonts.googleapis.com/css2?family=${f.import}&display=swap`}
      />

      <div style={{ backgroundColor: t.bgColor, color: t.textColor, fontFamily: f.body, minHeight: '100vh' }}>
        {/* Sections dans l'ordre choisi */}
        {sectionsOrder.map(sectionId => sectionComponents[sectionId])}

        {/* Footer */}
        <footer
          style={{ backgroundColor: t.footerBg, color: t.footerText }}
          className="py-6 text-center"
        >
          <p className="text-sm opacity-70">
            Site cree avec{' '}
            <a
              href="https://sparkhub.digital-code-growth.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: accent }}
              className="underline"
            >
              SparkHub
            </a>
          </p>
        </footer>

        {/* Bouton WhatsApp flottant */}
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-110"
            style={{ backgroundColor: '#25D366' }}
            title="Contacter sur WhatsApp"
          >
            <MessageCircle className="h-7 w-7 text-white" fill="white" />
          </a>
        )}
      </div>
    </>
  )
}

// --- Section components ---

type SectionProps = {
  site: SiteData
  t: (typeof THEMES)[string]
  accent: string
  f: (typeof FONTS)[string]
}

function HeroSection({ site, t, accent, f }: SectionProps) {
  return (
    <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
      {/* Image de fond */}
      {site.hero_image_url ? (
        <>
          <img
            src={site.hero_image_url}
            alt={site.business_name}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50" />
        </>
      ) : (
        <div className="absolute inset-0" style={{ background: t.headerBg }} />
      )}

      {/* Contenu */}
      <div className="relative z-10 text-center px-6 py-16">
        {site.logo_url && (
          <img
            src={site.logo_url}
            alt="Logo"
            className="h-20 w-20 rounded-full object-cover mx-auto mb-4 border-2 border-white/30"
          />
        )}
        <h1
          className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-3"
          style={{ fontFamily: f.title }}
        >
          {site.business_name}
        </h1>
        {site.slogan && (
          <p className="text-lg sm:text-xl text-white/80 max-w-xl mx-auto">
            {site.slogan}
          </p>
        )}
        {site.business_type && (
          <span
            className="inline-block mt-4 px-4 py-1.5 rounded-full text-sm font-medium text-white"
            style={{ backgroundColor: accent }}
          >
            {site.business_type}
          </span>
        )}
      </div>
    </section>
  )
}

function AboutSection({ site, t, accent, f }: SectionProps) {
  return (
    <section className="py-16 px-6">
      <div className="max-w-3xl mx-auto">
        <h2
          className="text-3xl font-bold mb-6 text-center"
          style={{ fontFamily: f.title, color: accent }}
        >
          A propos
        </h2>
        <div
          className="text-lg leading-relaxed whitespace-pre-line"
          style={{ color: t.mutedColor }}
        >
          {site.ai_description}
        </div>
      </div>
    </section>
  )
}

function ServicesSection({ site, t, accent, f }: SectionProps) {
  const isCards = site.services_layout !== 'list'

  return (
    <section className="py-16 px-6" style={{ backgroundColor: t.cardBg }}>
      <div className="max-w-4xl mx-auto">
        <h2
          className="text-3xl font-bold mb-8 text-center"
          style={{ fontFamily: f.title, color: accent }}
        >
          Nos offres
        </h2>

        {isCards ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {site.services.map((service, i) => (
              <div
                key={i}
                className="rounded-xl p-5 border transition-transform hover:scale-[1.02]"
                style={{ borderColor: t.cardBorder, backgroundColor: t.bgColor }}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg" style={{ fontFamily: f.title }}>
                    {service.name}
                  </h3>
                  {service.price && (
                    <span className="font-bold text-lg whitespace-nowrap ml-2" style={{ color: accent }}>
                      {service.price}
                    </span>
                  )}
                </div>
                {service.description && (
                  <p className="text-sm" style={{ color: t.mutedColor }}>
                    {service.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-0 divide-y" style={{ borderColor: t.cardBorder }}>
            {site.services.map((service, i) => (
              <div key={i} className="flex items-center justify-between py-4">
                <div>
                  <span className="font-medium" style={{ fontFamily: f.title }}>
                    {service.name}
                  </span>
                  {service.description && (
                    <p className="text-sm mt-0.5" style={{ color: t.mutedColor }}>
                      {service.description}
                    </p>
                  )}
                </div>
                {service.price && (
                  <span className="font-bold whitespace-nowrap ml-4" style={{ color: accent }}>
                    {service.price}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function GallerySection({ site, accent, f }: SectionProps) {
  return (
    <section className="py-16 px-6">
      <div className="max-w-5xl mx-auto">
        <h2
          className="text-3xl font-bold mb-8 text-center"
          style={{ fontFamily: f.title, color: accent }}
        >
          Galerie
        </h2>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
          {site.gallery_urls.map((url, i) => (
            <div key={i} className="aspect-square rounded-xl overflow-hidden">
              <img
                src={url}
                alt={`${site.business_name} photo ${i + 1}`}
                className="h-full w-full object-cover transition-transform hover:scale-105"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function HoursSection({ site, t, accent, f }: SectionProps) {
  return (
    <section className="py-16 px-6" style={{ backgroundColor: t.cardBg }}>
      <div className="max-w-md mx-auto">
        <h2
          className="text-3xl font-bold mb-8 text-center"
          style={{ fontFamily: f.title, color: accent }}
        >
          <Clock className="inline h-7 w-7 mr-2 -mt-1" style={{ color: accent }} />
          Horaires
        </h2>
        <div
          className="rounded-xl border p-6"
          style={{ borderColor: t.cardBorder, backgroundColor: t.bgColor }}
        >
          <div className="space-y-3">
            {DAYS.map(day => {
              const hours = site.opening_hours[day]
              if (!hours) return null
              const isClosed = hours.toLowerCase().includes('ferm')
              return (
                <div key={day} className="flex justify-between items-center">
                  <span className="font-medium">{day}</span>
                  <span
                    className="text-sm"
                    style={{ color: isClosed ? '#EF4444' : t.mutedColor }}
                  >
                    {hours}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

function ContactSection({ site, t, accent, f }: SectionProps) {
  return (
    <section className="py-16 px-6">
      <div className="max-w-lg mx-auto">
        <h2
          className="text-3xl font-bold mb-8 text-center"
          style={{ fontFamily: f.title, color: accent }}
        >
          Contact
        </h2>
        <div
          className="rounded-xl border p-6 space-y-4"
          style={{ borderColor: t.cardBorder, backgroundColor: t.cardBg }}
        >
          {site.address && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <MapPin className="h-5 w-5 flex-shrink-0" style={{ color: accent }} />
              <span>{site.address}</span>
            </a>
          )}
          {site.phone && (
            <a
              href={`tel:${site.phone}`}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <Phone className="h-5 w-5 flex-shrink-0" style={{ color: accent }} />
              <span>{site.phone}</span>
            </a>
          )}
          {site.email && (
            <a
              href={`mailto:${site.email}`}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <Mail className="h-5 w-5 flex-shrink-0" style={{ color: accent }} />
              <span>{site.email}</span>
            </a>
          )}
        </div>
      </div>
    </section>
  )
}

function SocialSection({ site, accent, f }: SectionProps) {
  const links = [
    { url: site.facebook_url, icon: Facebook, label: 'Facebook', color: '#1877F2' },
    { url: site.instagram_url, icon: Instagram, label: 'Instagram', color: '#E4405F' },
    { url: site.tiktok_url, icon: null, label: 'TikTok', color: '#000000', svg: true },
    { url: site.youtube_url, icon: null, label: 'YouTube', color: '#FF0000', svg: true },
  ].filter(l => l.url)

  return (
    <section className="py-16 px-6">
      <div className="max-w-lg mx-auto text-center">
        <h2
          className="text-3xl font-bold mb-8"
          style={{ fontFamily: f.title, color: accent }}
        >
          Suivez-nous
        </h2>
        <div className="flex justify-center gap-4 flex-wrap">
          {links.map((link, i) => (
            <a
              key={i}
              href={link.url!}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-3 rounded-full font-medium text-white transition-transform hover:scale-105"
              style={{ backgroundColor: link.color }}
            >
              {link.icon && <link.icon className="h-5 w-5" />}
              {link.label === 'TikTok' && (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.51a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.1a8.16 8.16 0 003.76.92V6.69z" />
                </svg>
              )}
              {link.label === 'YouTube' && (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.5 6.19a3.02 3.02 0 00-2.12-2.14C19.54 3.5 12 3.5 12 3.5s-7.54 0-9.38.55A3.02 3.02 0 00.5 6.19 31.56 31.56 0 000 12a31.56 31.56 0 00.5 5.81 3.02 3.02 0 002.12 2.14c1.84.55 9.38.55 9.38.55s7.54 0 9.38-.55a3.02 3.02 0 002.12-2.14A31.56 31.56 0 0024 12a31.56 31.56 0 00-.5-5.81zM9.54 15.57V8.43L15.82 12l-6.28 3.57z" />
                </svg>
              )}
              <span className="text-sm">{link.label}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
