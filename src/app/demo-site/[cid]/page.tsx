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

interface BrandColors {
  primary: string
  background: string
  accent: string
  text: string
  secondary: string
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
  brandColors: BrandColors | null
  logoUrl: string
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wytvwfgamfaoqmvoqzps.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

interface MappingResult {
  contactId: string
  brandColors: BrandColors | null
  logoUrl: string
}

async function resolveContact(slug: string): Promise<MappingResult | null> {
  const pitToken = process.env.GHL_PIT_TOKEN
  if (!pitToken) return null

  // D'abord essayer l'ID direct dans GHL
  const directResponse = await fetch(`${GHL_API_BASE}/contacts/${slug}`, {
    headers: { 'Authorization': `Bearer ${pitToken}`, 'Version': GHL_API_VERSION },
    cache: 'no-store',
  })
  if (directResponse.ok) {
    // ID direct OK, chercher quand même les couleurs dans Supabase
    let brandColors: BrandColors | null = null
    let logoUrl = ''
    if (SUPABASE_KEY) {
      const mapResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/demo_site_mapping?slug=eq.${encodeURIComponent(slug.toLowerCase())}&limit=1`,
        {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
          cache: 'no-store',
        }
      )
      if (mapResponse.ok) {
        const rows = await mapResponse.json()
        if (rows.length > 0) {
          brandColors = rows[0].brand_colors || null
          logoUrl = rows[0].logo_url || ''
        }
      }
    }
    return { contactId: slug, brandColors, logoUrl }
  }

  // Sinon chercher dans la table de mapping Supabase
  if (!SUPABASE_KEY) return null
  const mapResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/demo_site_mapping?slug=eq.${encodeURIComponent(slug.toLowerCase())}&limit=1`,
    {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
      cache: 'no-store',
    }
  )
  if (!mapResponse.ok) return null
  const rows = await mapResponse.json()
  if (rows.length === 0) return null
  return {
    contactId: rows[0].contact_id,
    brandColors: rows[0].brand_colors || null,
    logoUrl: rows[0].logo_url || '',
  }
}

async function fetchContactData(slug: string): Promise<SiteData | null> {
  const pitToken = process.env.GHL_PIT_TOKEN
  if (!pitToken || !slug) return null
  try {
    const mapping = await resolveContact(slug)
    if (!mapping) return null
    const response = await fetch(`${GHL_API_BASE}/contacts/${mapping.contactId}`, {
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
      brandColors: mapping.brandColors,
      logoUrl: mapping.logoUrl,
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

  const c = data.brandColors || {
    primary: '#C9A84C',
    background: '#080C1A',
    accent: '#E8D5A3',
    text: '#F0EDE6',
    secondary: '#0E1330',
  }

  return (
    <html lang="fr">
      <head>
        <title>{data.company}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: `
          *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

          body {
            font-family: 'DM Sans', -apple-system, sans-serif;
            background: ${c.background};
            color: ${c.text};
            min-height: 100vh;
            overflow-x: hidden;
            -webkit-font-smoothing: antialiased;
          }

          /* ═══ Decorative line patterns ═══ */
          .deco-line {
            display: flex;
            align-items: center;
            gap: 12px;
            justify-content: center;
            padding: 0 20px;
          }
          .deco-line::before, .deco-line::after {
            content: '';
            flex: 1;
            max-width: 60px;
            height: 1px;
            background: ${c.primary}40;
          }
          .deco-diamond {
            width: 6px;
            height: 6px;
            background: ${c.primary};
            transform: rotate(45deg);
            flex-shrink: 0;
          }

          /* ═══ Hero ═══ */
          .hero {
            position: relative;
            padding: 48px 20px 36px;
            text-align: center;
            background:
              radial-gradient(ellipse 120% 80% at 50% -20%, ${c.primary}12 0%, transparent 60%),
              linear-gradient(175deg, ${c.secondary} 0%, ${c.background} 100%);
            overflow: hidden;
          }

          .hero::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent 5%, ${c.primary}30 50%, transparent 95%);
          }

          .logo-wrap {
            width: 72px;
            height: 72px;
            margin: 0 auto 20px;
            border-radius: 50%;
            background: ${c.background};
            border: 2px solid ${c.primary}50;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Playfair Display', serif;
            font-size: 24px;
            font-weight: 700;
            color: ${c.primary};
            position: relative;
            overflow: hidden;
          }

          .logo-wrap::after {
            content: '';
            position: absolute;
            inset: -2px;
            border-radius: 50%;
            background: conic-gradient(from 0deg, ${c.primary}00, ${c.primary}60, ${c.primary}00);
            z-index: -1;
          }

          .logo-wrap img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 50%;
          }

          .company-name {
            font-family: 'Playfair Display', serif;
            font-size: 28px;
            font-weight: 800;
            color: ${c.text};
            margin-bottom: 6px;
            line-height: 1.15;
            letter-spacing: -0.02em;
          }

          .industry-tag {
            font-size: 10px;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 3px;
            color: ${c.primary};
            margin-bottom: 20px;
            display: block;
          }

          .description {
            color: ${c.text}99;
            font-size: 13px;
            line-height: 1.7;
            max-width: 320px;
            margin: 0 auto;
            font-weight: 300;
          }

          /* ═══ Location ═══ */
          .location {
            text-align: center;
            padding: 14px 20px;
            font-size: 12px;
            color: ${c.primary};
            font-weight: 500;
            letter-spacing: 1px;
            text-transform: uppercase;
            background: ${c.primary}08;
          }

          /* ═══ Menu Section ═══ */
          .menu {
            padding: 32px 20px;
            position: relative;
          }

          .section-header {
            text-align: center;
            margin-bottom: 24px;
          }

          .section-label {
            font-family: 'Playfair Display', serif;
            font-size: 20px;
            font-weight: 700;
            color: ${c.text};
            margin-bottom: 8px;
          }

          .menu-list {
            display: flex;
            flex-direction: column;
            gap: 1px;
          }

          .menu-item {
            display: flex;
            align-items: center;
            padding: 14px 16px;
            background: ${c.secondary}60;
            border-left: 2px solid transparent;
            transition: all 0.25s ease;
            position: relative;
          }

          .menu-item:first-child {
            border-radius: 12px 12px 0 0;
          }
          .menu-item:last-child {
            border-radius: 0 0 12px 12px;
          }

          .menu-item:hover {
            background: ${c.secondary};
            border-left-color: ${c.primary};
          }

          .menu-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: ${c.primary}60;
            margin-right: 14px;
            flex-shrink: 0;
          }

          .menu-item:hover .menu-dot {
            background: ${c.primary};
            box-shadow: 0 0 8px ${c.primary}60;
          }

          .menu-text {
            font-size: 13px;
            color: ${c.text}cc;
            font-weight: 400;
            line-height: 1.3;
          }

          /* ═══ Hours ═══ */
          .hours {
            padding: 28px 20px;
            text-align: center;
          }

          .hours-content {
            background: ${c.secondary}40;
            border: 1px solid ${c.primary}15;
            border-radius: 14px;
            padding: 20px;
          }

          .hours-line {
            color: ${c.text}88;
            font-size: 13px;
            padding: 8px 0;
            font-weight: 300;
          }

          /* ═══ CTA ═══ */
          .cta {
            padding: 20px 20px 32px;
            text-align: center;
          }

          .cta-inner {
            background: linear-gradient(135deg, ${c.primary}15, ${c.primary}08);
            border: 1px solid ${c.primary}25;
            border-radius: 16px;
            padding: 28px 20px;
          }

          .cta-label {
            font-family: 'Playfair Display', serif;
            font-size: 16px;
            font-weight: 600;
            color: ${c.text};
            margin-bottom: 8px;
          }

          .cta-desc {
            font-size: 12px;
            color: ${c.text}77;
            line-height: 1.6;
            margin-bottom: 20px;
            font-weight: 300;
          }

          .cta-btn {
            display: inline-block;
            background: ${c.primary};
            color: ${c.background};
            padding: 12px 28px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            text-decoration: none;
            letter-spacing: 0.5px;
            transition: all 0.3s ease;
          }

          .cta-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 20px ${c.primary}40;
          }

          /* ═══ Footer ═══ */
          .foot {
            text-align: center;
            padding: 16px;
            font-size: 10px;
            color: ${c.text}33;
            letter-spacing: 0.5px;
          }
          .foot a { color: ${c.primary}66; text-decoration: none; }

          /* ═══ Animations ═══ */
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .hero { animation: fadeUp 0.6s ease both; }
          .menu { animation: fadeUp 0.6s ease 0.15s both; }
          .hours { animation: fadeUp 0.6s ease 0.25s both; }
          .cta { animation: fadeUp 0.6s ease 0.35s both; }
        `}} />
      </head>
      <body>
        <div className="hero">
          <div className="logo-wrap">
            {data.logoUrl ? <img src={data.logoUrl} alt={data.company} /> : initials}
          </div>
          <h1 className="company-name">{data.company}</h1>
          {data.industry && <span className="industry-tag">{data.industry}</span>}
          <div className="deco-line"><div className="deco-diamond" /></div>
          {data.description && <p className="description" style={{ marginTop: '16px' }}>{data.description}</p>}
        </div>

        {data.serviceAreas && (
          <div className="location">📍 {data.serviceAreas}</div>
        )}

        {data.services.length > 0 && (
          <div className="menu">
            <div className="section-header">
              <h2 className="section-label">Nos Services</h2>
              <div className="deco-line"><div className="deco-diamond" /></div>
            </div>
            <div className="menu-list">
              {data.services.map((s, i) => (
                <div key={i} className="menu-item">
                  <div className="menu-dot" />
                  <span className="menu-text">{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.hours && (
          <div className="hours">
            <div className="section-header">
              <h2 className="section-label">Horaires</h2>
              <div className="deco-line"><div className="deco-diamond" /></div>
            </div>
            <div className="hours-content">
              {data.hours.split(/[;|]/).map((h, i) => (
                <div key={i} className="hours-line">{h.trim()}</div>
              ))}
            </div>
          </div>
        )}

        <div className="cta">
          <div className="cta-inner">
            <h3 className="cta-label">Un assistant IA pour vous</h3>
            <p className="cta-desc">
              Site professionnel + IA vocale qui gère vos appels 24h/24, même quand vous êtes occupé.
            </p>
            <a href="https://digital-code-growth.com" className="cta-btn">
              En savoir plus
            </a>
          </div>
        </div>

        <div className="foot">
          Aperçu par <a href="https://digital-code-growth.com">DCG AI</a>
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
