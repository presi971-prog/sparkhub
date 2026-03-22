// Mini-site généré pour les prospects SANS site web
// URL: /demo-site?company=X&industry=Y&services=Z&desc=W&hours=H

import { Suspense } from 'react'

function MiniSiteContent({ searchParams }: { searchParams: Record<string, string> }) {
  const company = searchParams.company || 'Mon Commerce'
  const industry = searchParams.industry || ''
  const services = (searchParams.services || '').split(',').map(s => s.trim()).filter(Boolean)
  const description = searchParams.desc || ''
  const hours = searchParams.hours || ''

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      color: '#f8fafc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* Hero */}
      <div style={{
        padding: '60px 20px',
        textAlign: 'center' as const,
      }}>
        <div style={{
          display: 'inline-block',
          background: 'rgba(59, 130, 246, 0.2)',
          color: '#60a5fa',
          padding: '6px 16px',
          borderRadius: '20px',
          fontSize: '0.85rem',
          marginBottom: '20px',
        }}>
          Aperçu de votre futur site
        </div>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 'bold',
          marginBottom: '12px',
          background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          {company}
        </h1>
        {industry && (
          <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginBottom: '8px' }}>
            {industry}
          </p>
        )}
        {description && (
          <p style={{
            color: '#cbd5e1',
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: 1.6,
          }}>
            {description}
          </p>
        )}
      </div>

      {/* Services */}
      {services.length > 0 && (
        <div style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', color: '#3b82f6' }}>
            Nos Services
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
          }}>
            {services.map((service, i) => (
              <div key={i} style={{
                background: 'rgba(30, 41, 59, 0.8)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '16px',
                fontSize: '0.95rem',
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
          <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', color: '#3b82f6' }}>
            Horaires
          </h2>
          <div style={{
            background: 'rgba(30, 41, 59, 0.5)',
            borderRadius: '12px',
            padding: '20px',
            lineHeight: 1.8,
          }}>
            {hours}
          </div>
        </div>
      )}

      {/* CTA */}
      <div style={{ textAlign: 'center' as const, padding: '40px 20px' }}>
        <p style={{ color: '#94a3b8', marginBottom: '16px', fontSize: '0.9rem' }}>
          Ce site a été généré automatiquement par DCG AI
        </p>
        <div style={{
          display: 'inline-block',
          background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
          color: 'white',
          padding: '16px 32px',
          borderRadius: '12px',
          fontSize: '1.1rem',
          fontWeight: 600,
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
