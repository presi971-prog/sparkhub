// Mini-site généré pour les prospects SANS site web
// URL: /demo-site?company=X&industry=Y&services=Z&desc=W&hours=H&colors=C

import { Suspense } from 'react'

// Thèmes visuels par secteur d'activité
const INDUSTRY_THEMES: Record<string, { emoji: string; gradient: string; accent: string; heroText: string }> = {
  'restaurant': { emoji: '🍽️', gradient: 'linear-gradient(135deg, #1a0a00 0%, #2d1810 50%, #1a0a00 100%)', accent: '#e67e22', heroText: 'Bienvenue dans notre restaurant' },
  'boulangerie': { emoji: '🥖', gradient: 'linear-gradient(135deg, #1a1200 0%, #2d2210 50%, #1a1200 100%)', accent: '#d4a535', heroText: 'Boulangerie artisanale' },
  'salon de coiffure': { emoji: '💇', gradient: 'linear-gradient(135deg, #1a0015 0%, #2d1028 50%, #1a0015 100%)', accent: '#e84393', heroText: 'Votre salon de coiffure' },
  'coiffure': { emoji: '💇', gradient: 'linear-gradient(135deg, #1a0015 0%, #2d1028 50%, #1a0015 100%)', accent: '#e84393', heroText: 'Votre salon de coiffure' },
  'garage': { emoji: '🔧', gradient: 'linear-gradient(135deg, #0a0a1a 0%, #101830 50%, #0a0a1a 100%)', accent: '#3498db', heroText: 'Votre garage automobile' },
  'garage auto': { emoji: '🔧', gradient: 'linear-gradient(135deg, #0a0a1a 0%, #101830 50%, #0a0a1a 100%)', accent: '#3498db', heroText: 'Votre garage automobile' },
  'cabinet d\'avocats': { emoji: '⚖️', gradient: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)', accent: '#9b59b6', heroText: 'Cabinet juridique' },
  'avocat': { emoji: '⚖️', gradient: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)', accent: '#9b59b6', heroText: 'Cabinet juridique' },
  'immobilier': { emoji: '🏠', gradient: 'linear-gradient(135deg, #001a0a 0%, #0d2e1a 50%, #001a0a 100%)', accent: '#27ae60', heroText: 'Agence immobilière' },
  'plombier': { emoji: '🔧', gradient: 'linear-gradient(135deg, #001a2e 0%, #0d2840 50%, #001a2e 100%)', accent: '#2980b9', heroText: 'Services de plomberie' },
  'électricien': { emoji: '⚡', gradient: 'linear-gradient(135deg, #1a1a00 0%, #2e2e0d 50%, #1a1a00 100%)', accent: '#f1c40f', heroText: 'Services électriques' },
  'beauté': { emoji: '💅', gradient: 'linear-gradient(135deg, #1a0015 0%, #2d1028 50%, #1a0015 100%)', accent: '#e84393', heroText: 'Institut de beauté' },
  'institut de beauté': { emoji: '💅', gradient: 'linear-gradient(135deg, #1a0015 0%, #2d1028 50%, #1a0015 100%)', accent: '#e84393', heroText: 'Institut de beauté' },
  'pharmacie': { emoji: '💊', gradient: 'linear-gradient(135deg, #001a0a 0%, #0d2e1a 50%, #001a0a 100%)', accent: '#2ecc71', heroText: 'Votre pharmacie' },
  'dentiste': { emoji: '🦷', gradient: 'linear-gradient(135deg, #0a1a2e 0%, #102840 50%, #0a1a2e 100%)', accent: '#00cec9', heroText: 'Cabinet dentaire' },
  'comptable': { emoji: '📊', gradient: 'linear-gradient(135deg, #0a0a1a 0%, #101830 50%, #0a0a1a 100%)', accent: '#3498db', heroText: 'Cabinet comptable' },
  'expert-comptable': { emoji: '📊', gradient: 'linear-gradient(135deg, #0a0a1a 0%, #101830 50%, #0a0a1a 100%)', accent: '#3498db', heroText: 'Cabinet d\'expertise comptable' },
  'fleuriste': { emoji: '🌸', gradient: 'linear-gradient(135deg, #1a0015 0%, #2d1028 50%, #1a0015 100%)', accent: '#fd79a8', heroText: 'Votre fleuriste' },
  'boucherie': { emoji: '🥩', gradient: 'linear-gradient(135deg, #1a0000 0%, #2d0a0a 50%, #1a0000 100%)', accent: '#c0392b', heroText: 'Votre boucherie' },
  'poissonnerie': { emoji: '🐟', gradient: 'linear-gradient(135deg, #001a2e 0%, #0d2840 50%, #001a2e 100%)', accent: '#0984e3', heroText: 'Votre poissonnerie' },
}

const DEFAULT_THEME = { emoji: '🏢', gradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', accent: '#3b82f6', heroText: 'Bienvenue' }

function getTheme(industry: string) {
  const key = industry.toLowerCase().trim()
  return INDUSTRY_THEMES[key] || DEFAULT_THEME
}

function MiniSiteContent({ searchParams }: { searchParams: Record<string, string> }) {
  const company = searchParams.company || 'Mon Commerce'
  const industry = searchParams.industry || ''
  const services = (searchParams.services || '').split(',').map(s => s.trim()).filter(Boolean)
  const description = searchParams.desc || ''
  const hours = searchParams.hours || ''
  const brandColors = searchParams.colors || ''

  const theme = getTheme(industry)
  const accentColor = brandColors.split(',')[0]?.trim() || theme.accent

  return (
    <div style={{
      minHeight: '100vh',
      background: theme.gradient,
      color: '#f8fafc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* Hero */}
      <div style={{
        padding: '80px 20px 60px',
        textAlign: 'center' as const,
        borderBottom: `2px solid ${accentColor}22`,
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>
          {theme.emoji}
        </div>
        <div style={{
          display: 'inline-block',
          background: `${accentColor}20`,
          color: accentColor,
          padding: '6px 16px',
          borderRadius: '20px',
          fontSize: '0.85rem',
          marginBottom: '24px',
          border: `1px solid ${accentColor}40`,
        }}>
          Aperçu de votre futur site
        </div>
        <h1 style={{
          fontSize: '2.8rem',
          fontWeight: 'bold',
          marginBottom: '8px',
          color: accentColor,
        }}>
          {company}
        </h1>
        {industry && (
          <p style={{ color: '#94a3b8', marginBottom: '16px', textTransform: 'uppercase' as const, letterSpacing: '2px', fontSize: '0.85rem' }}>
            {industry}
          </p>
        )}
        {description && (
          <p style={{
            color: '#cbd5e1',
            maxWidth: '650px',
            margin: '0 auto',
            lineHeight: 1.7,
            fontSize: '1.05rem',
          }}>
            {description}
          </p>
        )}
      </div>

      {/* Services */}
      {services.length > 0 && (
        <div style={{ padding: '50px 20px', maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '24px', color: accentColor, textAlign: 'center' as const }}>
            {theme.emoji} Nos Services
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
          }}>
            {services.map((service, i) => (
              <div key={i} style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${accentColor}30`,
                borderRadius: '12px',
                padding: '20px',
                fontSize: '0.95rem',
                textAlign: 'center' as const,
                transition: 'all 0.2s',
              }}>
                {service}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Horaires */}
      {hours && (
        <div style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', color: accentColor, textAlign: 'center' as const }}>
            🕐 Horaires d&apos;ouverture
          </h2>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: `1px solid ${accentColor}20`,
            borderRadius: '12px',
            padding: '24px',
            lineHeight: 1.8,
            textAlign: 'center' as const,
          }}>
            {hours.split(';').map((h, i) => (
              <div key={i} style={{ marginBottom: '4px' }}>{h.trim()}</div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div style={{ textAlign: 'center' as const, padding: '50px 20px 30px' }}>
        <p style={{ color: '#64748b', marginBottom: '12px', fontSize: '0.8rem' }}>
          Site d&apos;aperçu conçu par DCG AI
        </p>
        <p style={{ color: '#94a3b8', marginBottom: '24px', fontSize: '1rem', maxWidth: '500px', margin: '0 auto 24px' }}>
          Nous pouvons créer votre site professionnel et y intégrer une IA vocale qui répond à vos clients 24h/24.
        </p>
        <div style={{
          display: 'inline-block',
          background: accentColor,
          color: 'white',
          padding: '16px 32px',
          borderRadius: '12px',
          fontSize: '1.1rem',
          fontWeight: 600,
          boxShadow: `0 4px 20px ${accentColor}40`,
        }}>
          Votre site + IA vocale par DCG AI
        </div>
      </div>
    </div>
  )
}

export default async function DemoSitePage(props: {
  searchParams: Promise<Record<string, string>>
}) {
  const searchParams = await props.searchParams

  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <MiniSiteContent searchParams={searchParams} />
    </Suspense>
  )
}
