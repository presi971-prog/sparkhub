// Mini-site premium pour les prospects SANS site web
// Design dark mode, glassmorphism, style SparkHub

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
  email: string
  firstName: string
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wytvwfgamfaoqmvoqzps.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

async function resolveContactId(slug: string): Promise<string | null> {
  // D'abord essayer l'ID direct dans GHL
  const pitToken = process.env.GHL_PIT_TOKEN
  if (!pitToken) return null
  const directResponse = await fetch(`${GHL_API_BASE}/contacts/${slug}`, {
    headers: { 'Authorization': `Bearer ${pitToken}`, 'Version': GHL_API_VERSION },
    cache: 'no-store',
  })
  if (directResponse.ok) return slug

  // Sinon chercher dans la table de mapping Supabase (slug en minuscules → ID original)
  if (!SUPABASE_KEY) return null
  const mapResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/demo_site_mapping?slug=eq.${encodeURIComponent(slug.toLowerCase())}&limit=1`,
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
      cache: 'no-store',
    }
  )
  if (!mapResponse.ok) return null
  const rows = await mapResponse.json()
  if (rows.length === 0) return null
  return rows[0].contact_id
}

async function fetchContactData(slug: string): Promise<SiteData | null> {
  const pitToken = process.env.GHL_PIT_TOKEN
  if (!pitToken || !slug) return null
  try {
    const contactId = await resolveContactId(slug)
    if (!contactId) return null
    const response = await fetch(`${GHL_API_BASE}/contacts/${contactId}`, {
      headers: { 'Authorization': `Bearer ${pitToken}`, 'Version': GHL_API_VERSION },
      cache: 'no-store',
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
      email: contact.email || '',
      firstName: contact.firstName || '',
      industry: fields.industry || '',
      description: fields.description || '',
      services: (fields.services || '').split(',').map((s: string) => s.trim()).filter(Boolean),
      serviceAreas: fields.serviceAreas || '',
      hours: fields.hours || '',
    }
  } catch { return null }
}

function MiniSite({ data }: { data: SiteData }) {
  const initials = data.company
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()

  return (
    <html lang="fr">
      <head>
        <title>{data.company}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: `
          * { margin: 0; padding: 0; box-sizing: border-box; }

          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: #0a0a1a;
            color: #e2e8f0;
            min-height: 100vh;
            overflow-x: hidden;
          }

          /* Hero */
          .hero {
            position: relative;
            padding: 80px 24px 60px;
            text-align: center;
            background: linear-gradient(180deg, #0f1629 0%, #0a0a1a 100%);
            overflow: hidden;
          }

          .hero::before {
            content: '';
            position: absolute;
            top: -50%;
            left: 50%;
            transform: translateX(-50%);
            width: 800px;
            height: 800px;
            background: radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 70%);
            pointer-events: none;
          }

          .hero::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.4), transparent);
          }

          .logo-circle {
            width: 80px;
            height: 80px;
            margin: 0 auto 24px;
            border-radius: 20px;
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            font-weight: 800;
            color: white;
            box-shadow: 0 8px 32px rgba(139, 92, 246, 0.3);
            position: relative;
          }

          .company-name {
            font-size: clamp(2rem, 5vw, 3rem);
            font-weight: 800;
            color: #f8fafc;
            margin-bottom: 8px;
            line-height: 1.1;
            position: relative;
          }

          .industry-badge {
            display: inline-block;
            background: rgba(139, 92, 246, 0.15);
            border: 1px solid rgba(139, 92, 246, 0.3);
            color: #a78bfa;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 2px;
            padding: 6px 16px;
            border-radius: 20px;
            margin-bottom: 28px;
            position: relative;
          }

          .description {
            color: #94a3b8;
            max-width: 560px;
            margin: 0 auto;
            line-height: 1.7;
            font-size: 16px;
            position: relative;
          }

          /* Location */
          .location-bar {
            text-align: center;
            padding: 16px 24px;
            color: #64748b;
            font-size: 14px;
            font-weight: 500;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            background: rgba(15, 22, 41, 0.5);
          }

          /* Sections */
          .section {
            max-width: 800px;
            margin: 0 auto;
            padding: 56px 24px;
          }

          .section-title {
            font-size: 22px;
            font-weight: 700;
            color: #f1f5f9;
            margin-bottom: 32px;
            text-align: center;
          }

          .section-title::after {
            content: '';
            display: block;
            width: 40px;
            height: 3px;
            background: linear-gradient(90deg, #3b82f6, #8b5cf6);
            margin: 12px auto 0;
            border-radius: 2px;
          }

          /* Services */
          .services-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 16px;
          }

          .service-card {
            background: rgba(30, 41, 59, 0.5);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.07);
            border-radius: 14px;
            padding: 20px;
            font-size: 15px;
            color: #cbd5e1;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
          }

          .service-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 3px;
            height: 100%;
            background: linear-gradient(180deg, #3b82f6, #8b5cf6);
            border-radius: 3px 0 0 3px;
          }

          .service-card:hover {
            border-color: rgba(139, 92, 246, 0.3);
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
          }

          /* Hours */
          .hours-box {
            background: rgba(30, 41, 59, 0.5);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.07);
            border-radius: 16px;
            padding: 28px;
            max-width: 440px;
            margin: 0 auto;
          }

          .hours-line {
            color: #94a3b8;
            font-size: 15px;
            padding: 10px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            display: flex;
            justify-content: center;
          }

          .hours-line:last-child { border-bottom: none; }

          /* Divider */
          .divider {
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.06), transparent);
          }

          /* CTA */
          .cta-section {
            text-align: center;
            padding: 56px 24px 80px;
            position: relative;
          }

          .cta-section::before {
            content: '';
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 600px;
            height: 400px;
            background: radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%);
            pointer-events: none;
          }

          .cta-card {
            background: rgba(30, 41, 59, 0.4);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 20px;
            padding: 40px 32px;
            max-width: 500px;
            margin: 0 auto;
            position: relative;
          }

          .cta-emoji {
            font-size: 40px;
            margin-bottom: 16px;
          }

          .cta-title {
            font-size: 20px;
            font-weight: 700;
            color: #f1f5f9;
            margin-bottom: 12px;
          }

          .cta-text {
            color: #94a3b8;
            font-size: 15px;
            max-width: 380px;
            margin: 0 auto 28px;
            line-height: 1.6;
          }

          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            color: #fff;
            padding: 14px 32px;
            border-radius: 12px;
            font-size: 15px;
            font-weight: 700;
            text-decoration: none;
            box-shadow: 0 4px 20px rgba(139, 92, 246, 0.3);
            transition: all 0.3s ease;
          }

          .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 30px rgba(139, 92, 246, 0.4);
          }

          /* Footer */
          .footer {
            text-align: center;
            padding: 20px;
            color: #475569;
            font-size: 12px;
            border-top: 1px solid rgba(255, 255, 255, 0.04);
          }

          .footer a {
            color: #8b5cf6;
            text-decoration: none;
          }

          /* Responsive */
          @media (max-width: 640px) {
            .hero { padding: 60px 20px 48px; }
            .section { padding: 40px 20px; }
            .services-grid { grid-template-columns: 1fr; }
            .cta-card { padding: 32px 24px; }
          }
        `}} />
      </head>
      <body>
        <div className="hero">
          <div className="logo-circle">{initials}</div>
          <h1 className="company-name">{data.company}</h1>
          {data.industry && <div className="industry-badge">{data.industry}</div>}
          {data.description && <p className="description">{data.description}</p>}
        </div>

        {data.serviceAreas && (
          <div className="location-bar">📍 {data.serviceAreas}</div>
        )}

        {data.services.length > 0 && (
          <div className="section">
            <h2 className="section-title">Nos Services</h2>
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
          <div className="cta-card">
            <div className="cta-emoji">🤖</div>
            <h3 className="cta-title">Votre assistant IA 24h/24</h3>
            <p className="cta-text">
              Nous pouvons créer votre site professionnel et y intégrer une IA vocale
              qui répond à vos clients même quand vous êtes occupé.
            </p>
            <a href="https://digital-code-growth.com" className="cta-button">
              Découvrir DCG AI →
            </a>
          </div>
        </div>

        <div className="footer">
          Aperçu généré par <a href="https://digital-code-growth.com">DCG AI</a>
        </div>

        <script
          src="https://widgets.leadconnectorhq.com/loader.js"
          data-resources-url="https://widgets.leadconnectorhq.com/chat-widget/loader.js"
          data-widget-id="69a4824de7bf964f7dfea20d"
        />
        {data.email && (
          <script dangerouslySetInnerHTML={{ __html: `
            window.addEventListener('message', function(e) {
              if (e.data && e.data.type === 'LC_CHAT_WIDGET_READY') {
                var iframe = document.querySelector('iframe[src*="widgets.leadconnectorhq"]');
                if (iframe) {
                  iframe.contentWindow.postMessage({
                    type: 'LC_SET_CONTACT',
                    email: '${data.email}',
                    name: '${data.firstName}'
                  }, '*');
                }
              }
            });
          `}} />
        )}
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

  return <MiniSite data={data} />
}
