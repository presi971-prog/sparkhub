// Mini-site généré pour les prospects SANS site web
// Récupère les données du contact GHL par son ID et affiche un site avec ses VRAIS éléments

import { Suspense } from 'react'

const GHL_API_BASE = 'https://services.leadconnectorhq.com'
const GHL_API_VERSION = '2021-07-28'

// IDs internes des custom fields GHL
const FIELD_MAP: Record<string, string> = {
  'SinwSUnXHLkzYZfeiiAt': 'description',
  'n8OA1p2bKpGPoR0LLBVa': 'industry',
  'fa2a2U0TfblbWHBhUD1D': 'services',
  'wPG567tRa4nL6NhXUgSb': 'serviceAreas',
  '8FTympBEanG4WErZgJSO': 'hours',
  'eyTCI2cknifRwOKELlxs': 'faq',
  'AU658hVt3Vh5ukwtckHw': 'facebookUrl',
}

interface SiteData {
  company: string
  industry: string
  description: string
  services: string[]
  hours: string
  facebookUrl: string
}

async function fetchContactData(contactId: string): Promise<SiteData | null> {
  const pitToken = process.env.GHL_PIT_TOKEN
  if (!pitToken || !contactId) return null

  try {
    const response = await fetch(`${GHL_API_BASE}/contacts/${contactId}`, {
      headers: {
        'Authorization': `Bearer ${pitToken}`,
        'Version': GHL_API_VERSION,
      },
      next: { revalidate: 60 },
    })

    if (!response.ok) return null

    const data = await response.json()
    const contact = data.contact || data

    const fields: Record<string, string> = {}
    for (const f of contact.customFields || []) {
      const name = FIELD_MAP[f.id]
      if (name) fields[name] = f.value || ''
    }

    return {
      company: contact.companyName || 'Mon Commerce',
      industry: fields.industry || '',
      description: fields.description || '',
      services: (fields.services || '').split(',').map((s: string) => s.trim()).filter(Boolean),
      hours: fields.hours || '',
      facebookUrl: fields.facebookUrl || '',
    }
  } catch {
    return null
  }
}

function MiniSiteContent({ data, colors }: { data: SiteData; colors: string }) {
  const colorList = colors.split(',').filter(c => c.startsWith('#'))
  const primary = colorList[0] || '#e67e22'
  const secondary = colorList[1] || '#1a1200'

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${secondary} 0%, #0f172a 100%)`,
      color: '#f8fafc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* Header */}
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

      {/* Hero */}
      <div style={{
        padding: '20px 20px 50px',
        textAlign: 'center' as const,
        borderBottom: `2px solid ${primary}22`,
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 'bold',
          marginBottom: '8px',
          color: primary,
        }}>
          {data.company}
        </h1>
        {data.industry && (
          <p style={{
            color: '#94a3b8',
            marginBottom: '16px',
            textTransform: 'uppercase' as const,
            letterSpacing: '2px',
            fontSize: '0.85rem',
          }}>
            {data.industry}
          </p>
        )}
        {data.description && (
          <p style={{
            color: '#cbd5e1',
            maxWidth: '650px',
            margin: '0 auto',
            lineHeight: 1.7,
            fontSize: '1.05rem',
          }}>
            {data.description}
          </p>
        )}
      </div>

      {/* Services */}
      {data.services.length > 0 && (
        <div style={{ padding: '50px 20px', maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '24px', color: primary, textAlign: 'center' as const }}>
            Nos Services
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
          }}>
            {data.services.map((service, i) => (
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
      {data.hours && (
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
            {data.hours.split(';').map((h, i) => (
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
          Aper&ccedil;u g&eacute;n&eacute;r&eacute; par DCG AI
        </p>
      </div>
    </div>
  )
}

export default async function DemoSitePage(props: {
  searchParams: Promise<Record<string, string>>
}) {
  const searchParams = await props.searchParams
  const contactId = searchParams.cid
  const colors = searchParams.colors || ''

  if (!contactId) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Aucun commerce à afficher</div>
  }

  const data = await fetchContactData(contactId)

  if (!data) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Commerce introuvable</div>
  }

  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <MiniSiteContent data={data} colors={colors} />
    </Suspense>
  )
}
