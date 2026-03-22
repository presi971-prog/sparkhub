// Mini-site généré pour les prospects SANS site web
// Récupère les données du contact GHL et affiche un site pro avec les VRAIES couleurs

import { Suspense } from 'react'

const GHL_API_BASE = 'https://services.leadconnectorhq.com'
const GHL_API_VERSION = '2021-07-28'

const FIELD_MAP: Record<string, string> = {
  'SinwSUnXHLkzYZfeiiAt': 'description',
  'n8OA1p2bKpGPoR0LLBVa': 'industry',
  'fa2a2U0TfblbWHBhUD1D': 'services',
  'wPG567tRa4nL6NhXUgSb': 'serviceAreas',
  '8FTympBEanG4WErZgJSO': 'hours',
  'eyTCI2cknifRwOKELlxs': 'faq',
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

function MiniSite({ data, primary, secondary, accent }: { data: SiteData; primary: string; secondary: string; accent: string }) {
  return (
    <html lang="fr">
      <head>
        <title>{data.company} — Aperçu</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style dangerouslySetInnerHTML={{ __html: `
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: ${secondary};
            color: #fff;
            min-height: 100vh;
          }
          .hero {
            background: linear-gradient(180deg, ${primary}15 0%, ${secondary} 100%);
            padding: 80px 24px 60px;
            text-align: center;
            border-bottom: 1px solid ${primary}30;
          }
          .badge {
            display: inline-block;
            background: ${primary}18;
            color: ${primary};
            border: 1px solid ${primary}35;
            padding: 8px 20px;
            border-radius: 50px;
            font-size: 13px;
            font-weight: 500;
            letter-spacing: 0.5px;
            margin-bottom: 32px;
          }
          .company-name {
            font-size: clamp(2rem, 5vw, 3.2rem);
            font-weight: 800;
            color: ${primary};
            margin-bottom: 8px;
            line-height: 1.1;
          }
          .industry {
            color: #8899aa;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 3px;
            margin-bottom: 28px;
          }
          .description {
            color: #b0bec5;
            max-width: 620px;
            margin: 0 auto;
            line-height: 1.75;
            font-size: 16px;
          }
          .section {
            max-width: 780px;
            margin: 0 auto;
            padding: 56px 24px;
          }
          .section-title {
            font-size: 22px;
            font-weight: 700;
            color: #fff;
            margin-bottom: 28px;
            text-align: center;
            position: relative;
          }
          .section-title::after {
            content: '';
            display: block;
            width: 40px;
            height: 3px;
            background: ${primary};
            margin: 12px auto 0;
            border-radius: 2px;
          }
          .services-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 14px;
          }
          .service-card {
            background: #ffffff08;
            border: 1px solid ${primary}20;
            border-radius: 14px;
            padding: 22px 18px;
            text-align: center;
            font-size: 15px;
            color: #e0e6ed;
            transition: border-color 0.2s, transform 0.2s;
          }
          .service-card:hover {
            border-color: ${primary}60;
            transform: translateY(-2px);
          }
          .hours-box {
            background: #ffffff06;
            border: 1px solid ${primary}15;
            border-radius: 14px;
            padding: 28px 24px;
            text-align: center;
          }
          .hours-line {
            color: #c0cad5;
            font-size: 15px;
            padding: 6px 0;
            border-bottom: 1px solid #ffffff08;
          }
          .hours-line:last-child { border-bottom: none; }
          .location {
            text-align: center;
            padding: 0 24px 20px;
            color: #7a8a9a;
            font-size: 14px;
          }
          .cta-section {
            text-align: center;
            padding: 40px 24px 60px;
            border-top: 1px solid #ffffff08;
          }
          .cta-text {
            color: #8899aa;
            font-size: 15px;
            max-width: 440px;
            margin: 0 auto 28px;
            line-height: 1.6;
          }
          .cta-button {
            display: inline-block;
            background: ${primary};
            color: #fff;
            padding: 18px 40px;
            border-radius: 14px;
            font-size: 17px;
            font-weight: 700;
            text-decoration: none;
            box-shadow: 0 6px 30px ${primary}50;
            transition: transform 0.2s, box-shadow 0.2s;
          }
          .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 40px ${primary}70;
          }
          .footer {
            text-align: center;
            padding: 20px;
            color: #4a5568;
            font-size: 12px;
          }
          .divider {
            width: 100%;
            height: 1px;
            background: linear-gradient(90deg, transparent, ${primary}20, transparent);
            margin: 0;
          }
        `}} />
      </head>
      <body>
        <div className="hero">
          <div className="badge">Aperçu de votre futur site</div>
          <h1 className="company-name">{data.company}</h1>
          {data.industry && <p className="industry">{data.industry}</p>}
          {data.description && <p className="description">{data.description}</p>}
        </div>

        {data.serviceAreas && (
          <div className="location">📍 {data.serviceAreas}</div>
        )}

        {data.services.length > 0 && (
          <>
            <div className="divider" />
            <div className="section">
              <h2 className="section-title">Nos Services</h2>
              <div className="services-grid">
                {data.services.map((s, i) => (
                  <div key={i} className="service-card">{s}</div>
                ))}
              </div>
            </div>
          </>
        )}

        {data.hours && (
          <>
            <div className="divider" />
            <div className="section">
              <h2 className="section-title">Horaires</h2>
              <div className="hours-box">
                {data.hours.split(/[;|]/).map((h, i) => (
                  <div key={i} className="hours-line">{h.trim()}</div>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="divider" />
        <div className="cta-section">
          <p className="cta-text">
            Nous pouvons créer votre site professionnel et y intégrer une IA vocale
            qui répond à vos clients 24h/24, 7j/7.
          </p>
          <a href="https://digital-code-growth.com" className="cta-button">
            Découvrir DCG AI
          </a>
        </div>
        <div className="footer">Aperçu généré par DCG AI — digital-code-growth.com</div>
      </body>
    </html>
  )
}

export default async function DemoSitePage(props: {
  params: Promise<{ cid: string }>
  searchParams: Promise<Record<string, string>>
}) {
  const { cid: contactId } = await props.params
  const searchParams = await props.searchParams
  const colors = searchParams.colors || ''

  if (!contactId) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontFamily: 'sans-serif' }}>Aucun commerce à afficher</div>
  }

  const data = await fetchContactData(contactId)
  if (!data) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontFamily: 'sans-serif' }}>Commerce introuvable</div>
  }

  // Couleurs : depuis l'analyse IA ou défaut
  const colorList = colors.split(',').filter(c => c.startsWith('#'))
  const primary = colorList[0] || '#e8a838'
  const secondary = colorList[1] || '#1a1510'
  const accent = colorList[2] || primary

  return <MiniSite data={data} primary={primary} secondary={secondary} accent={accent} />
}
