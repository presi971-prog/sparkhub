// Mini-site généré pour les prospects SANS site web
// Fond clair, pro, couleurs de la marque en accent

import { Suspense } from 'react'

const GHL_API_BASE = 'https://services.leadconnectorhq.com'
const GHL_API_VERSION = '2021-07-28'

const FIELD_MAP: Record<string, string> = {
  'SinwSUnXHLkzYZfeiiAt': 'description',
  'n8OA1p2bKpGPoR0LLBVa': 'industry',
  'fa2a2U0TfblbWHBhUD1D': 'services',
  'wPG567tRa4nL6NhXUgSb': 'serviceAreas',
  '8FTympBEanG4WErZgJSO': 'hours',
}

interface SiteData {
  company: string
  industry: string
  description: string
  services: string[]
  serviceAreas: string
  hours: string
}

async function fetchContactData(contactId: string): Promise<SiteData | null> {
  const pitToken = process.env.GHL_PIT_TOKEN
  if (!pitToken || !contactId) return null
  try {
    const response = await fetch(`${GHL_API_BASE}/contacts/${contactId}`, {
      headers: { 'Authorization': `Bearer ${pitToken}`, 'Version': GHL_API_VERSION },
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
      company: contact.companyName || '',
      industry: fields.industry || '',
      description: fields.description || '',
      services: (fields.services || '').split(',').map((s: string) => s.trim()).filter(Boolean),
      serviceAreas: fields.serviceAreas || '',
      hours: fields.hours || '',
    }
  } catch { return null }
}

function MiniSite({ data, primary }: { data: SiteData; primary: string }) {
  return (
    <html lang="fr">
      <head>
        <title>{data.company}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style dangerouslySetInnerHTML={{ __html: `
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #ffffff;
            color: #1a1a2e;
            min-height: 100vh;
          }
          .topbar {
            background: ${primary};
            height: 4px;
          }
          .hero {
            background: #fafbfc;
            padding: 60px 24px 48px;
            text-align: center;
            border-bottom: 1px solid #e8ecf1;
          }
          .company-name {
            font-size: clamp(1.8rem, 5vw, 2.8rem);
            font-weight: 800;
            color: #1a1a2e;
            margin-bottom: 6px;
            line-height: 1.15;
          }
          .industry {
            color: ${primary};
            font-size: 14px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 24px;
          }
          .description {
            color: #555;
            max-width: 600px;
            margin: 0 auto;
            line-height: 1.7;
            font-size: 16px;
          }
          .location-bar {
            text-align: center;
            padding: 14px 24px;
            background: #f5f6f8;
            color: #666;
            font-size: 14px;
            border-bottom: 1px solid #e8ecf1;
          }
          .section {
            max-width: 760px;
            margin: 0 auto;
            padding: 48px 24px;
          }
          .section-title {
            font-size: 20px;
            font-weight: 700;
            color: #1a1a2e;
            margin-bottom: 24px;
            text-align: center;
          }
          .section-title span {
            display: inline-block;
            border-bottom: 3px solid ${primary};
            padding-bottom: 6px;
          }
          .services-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 12px;
          }
          .service-card {
            background: #f8f9fb;
            border: 1px solid #e8ecf1;
            border-left: 3px solid ${primary};
            border-radius: 8px;
            padding: 18px 16px;
            font-size: 15px;
            color: #333;
          }
          .hours-box {
            background: #f8f9fb;
            border: 1px solid #e8ecf1;
            border-radius: 10px;
            padding: 24px;
            max-width: 400px;
            margin: 0 auto;
          }
          .hours-line {
            color: #444;
            font-size: 15px;
            padding: 8px 0;
            border-bottom: 1px solid #eef0f3;
            display: flex;
            justify-content: center;
          }
          .hours-line:last-child { border-bottom: none; }
          .divider {
            height: 1px;
            background: #e8ecf1;
          }
          .cta-section {
            text-align: center;
            padding: 48px 24px;
            background: #fafbfc;
            border-top: 1px solid #e8ecf1;
          }
          .cta-text {
            color: #666;
            font-size: 15px;
            max-width: 420px;
            margin: 0 auto 24px;
            line-height: 1.6;
          }
          .cta-button {
            display: inline-block;
            background: ${primary};
            color: #fff;
            padding: 16px 36px;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 700;
            text-decoration: none;
            box-shadow: 0 4px 16px ${primary}40;
          }
          .footer {
            text-align: center;
            padding: 16px;
            color: #aaa;
            font-size: 11px;
            background: #fafbfc;
          }
        `}} />
      </head>
      <body>
        <div className="topbar" />
        <div className="hero">
          <h1 className="company-name">{data.company}</h1>
          {data.industry && <p className="industry">{data.industry}</p>}
          {data.description && <p className="description">{data.description}</p>}
        </div>

        {data.serviceAreas && (
          <div className="location-bar">📍 {data.serviceAreas}</div>
        )}

        {data.services.length > 0 && (
          <div className="section">
            <h2 className="section-title"><span>Nos Services</span></h2>
            <div className="services-grid">
              {data.services.map((s, i) => (
                <div key={i} className="service-card">{s}</div>
              ))}
            </div>
          </div>
        )}

        {data.hours && (
          <>
            <div className="divider" />
            <div className="section">
              <h2 className="section-title"><span>Horaires</span></h2>
              <div className="hours-box">
                {data.hours.split(/[;|]/).map((h, i) => (
                  <div key={i} className="hours-line">{h.trim()}</div>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="cta-section">
          <p className="cta-text">
            Nous pouvons créer votre site professionnel et y intégrer une IA vocale
            qui répond à vos clients 24h/24.
          </p>
          <a href="https://digital-code-growth.com" className="cta-button">
            Découvrir DCG AI
          </a>
        </div>
        <div className="footer">Aperçu généré par DCG AI</div>
      </body>
    </html>
  )
}

export default async function DemoSitePage(props: {
  params: Promise<{ cid: string }>
  searchParams: Promise<Record<string, string>>
}) {
  const { cid: contactId } = await props.params

  if (!contactId) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#999', fontFamily: 'sans-serif' }}>Aucun commerce à afficher</div>
  }

  const data = await fetchContactData(contactId)
  if (!data) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#999', fontFamily: 'sans-serif' }}>Commerce introuvable</div>
  }

  // Couleur d'accent par défaut — sera remplacée par les vraies couleurs quand le custom field sera ajouté
  const primary = '#e67e22'

  return <MiniSite data={data} primary={primary} />
}
