// Mini-site généré pour les prospects SANS site web
// Affiche les VRAIES couleurs, le VRAI logo et les VRAIES photos du prospect

import { Suspense } from 'react'

function MiniSiteContent({ searchParams }: { searchParams: Record<string, string> }) {
  const company = searchParams.company || 'Mon Commerce'
  const industry = searchParams.industry || ''
  const services = (searchParams.services || '').split(',').map(s => s.trim()).filter(Boolean)
  const description = searchParams.desc || ''
  const hours = searchParams.hours || ''
  const colors = (searchParams.colors || '').split(',').map(s => s.trim()).filter(Boolean)
  const logoUrl = searchParams.logo || ''
  const imageUrls = (searchParams.imgs || '').split('|').filter(u => u.length > 10)

  // Couleurs de la marque — issues de l'analyse IA du logo
  const primary = colors[0] || '#3b82f6'
  const secondary = colors[1] || '#1e293b'

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${secondary} 0%, #0f172a 100%)`,
      color: '#f8fafc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* Header avec logo */}
      <div style={{
        padding: '40px 20px 20px',
        textAlign: 'center' as const,
      }}>
        <div style={{
          display: 'inline-block',
          background: `${primary}20`,
          color: primary,
          padding: '6px 16px',
          borderRadius: '20px',
          fontSize: '0.8rem',
          marginBottom: '20px',
          border: `1px solid ${primary}40`,
        }}>
          Aperçu de votre futur site par DCG AI
        </div>
      </div>

      {/* Hero avec logo */}
      <div style={{
        padding: '20px 20px 50px',
        textAlign: 'center' as const,
        borderBottom: `2px solid ${primary}22`,
      }}>
        {logoUrl && (
          <div style={{ marginBottom: '24px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt={company}
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: `3px solid ${primary}`,
                boxShadow: `0 4px 20px ${primary}40`,
              }}
            />
          </div>
        )}
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 'bold',
          marginBottom: '8px',
          color: primary,
        }}>
          {company}
        </h1>
        {industry && (
          <p style={{
            color: '#94a3b8',
            marginBottom: '16px',
            textTransform: 'uppercase' as const,
            letterSpacing: '2px',
            fontSize: '0.85rem',
          }}>
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

      {/* Photos du prospect */}
      {imageUrls.length > 0 && (
        <div style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: imageUrls.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
          }}>
            {imageUrls.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={url}
                alt={`${company} - photo ${i + 1}`}
                style={{
                  width: '100%',
                  height: '200px',
                  objectFit: 'cover',
                  borderRadius: '12px',
                  border: `1px solid ${primary}30`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Services */}
      {services.length > 0 && (
        <div style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '24px', color: primary, textAlign: 'center' as const }}>
            Nos Services
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
          }}>
            {services.map((service, i) => (
              <div key={i} style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${primary}30`,
                borderRadius: '12px',
                padding: '20px',
                fontSize: '0.95rem',
                textAlign: 'center' as const,
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
          <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', color: primary, textAlign: 'center' as const }}>
            Horaires d&apos;ouverture
          </h2>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: `1px solid ${primary}20`,
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
        <p style={{ color: '#94a3b8', marginBottom: '24px', fontSize: '1rem', maxWidth: '500px', margin: '0 auto 24px' }}>
          Nous pouvons cr&eacute;er votre site professionnel et y int&eacute;grer une IA vocale qui r&eacute;pond &agrave; vos clients 24h/24.
        </p>
        <div style={{
          display: 'inline-block',
          background: primary,
          color: 'white',
          padding: '16px 32px',
          borderRadius: '12px',
          fontSize: '1.1rem',
          fontWeight: 600,
          boxShadow: `0 4px 20px ${primary}40`,
        }}>
          Votre site + IA vocale par DCG AI
        </div>
        <p style={{ color: '#64748b', marginTop: '16px', fontSize: '0.75rem' }}>
          Aper&ccedil;u g&eacute;n&eacute;r&eacute; par DCG AI &mdash; digital-code-growth.com
        </p>
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
