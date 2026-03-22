// Smart Crawler — Mini-site generator
// Génère une URL de mini-site pour les prospects SANS site web
// Utilise une page dynamique SparkHub qui affiche les infos extraites + widget

import type { ExtractedData } from './types'

/**
 * Génère l'URL d'un mini-site dynamique pour un prospect sans site web.
 *
 * Le mini-site est une page hébergée sur SparkHub qui prend les infos
 * du prospect en query params et affiche une page pro avec le widget.
 *
 * Format : /demo-site?company=X&industry=Y&services=Z&description=W
 */
export function generateMiniSiteUrl(
  contactId: string,
  companyName: string,
  extractedData: ExtractedData
): string {
  // Toujours utiliser le domaine de production (NEXT_PUBLIC_APP_URL peut être localhost)
  const baseUrl = 'https://sparkhub.digital-code-growth.com'

  const params = new URLSearchParams({
    cid: contactId,
    company: companyName || 'Mon Commerce',
    industry: extractedData.industry || '',
    services: extractedData.services || '',
    desc: extractedData.description || '',
    hours: extractedData.hours || '',
    colors: extractedData.brandColors || '',
    logo: extractedData.logoUrl || '',
    imgs: extractedData.imageUrls.join('|'),
  })

  return `${baseUrl}/demo-site?${params.toString()}`
}

/**
 * Génère le HTML d'un mini-site statique (alternative).
 * Peut être stocké et servi comme page statique si nécessaire.
 */
export function generateMiniSiteHtml(
  companyName: string,
  extractedData: ExtractedData
): string {
  const services = extractedData.services
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const servicesHtml = services.length > 0
    ? services.map((s) => `<li>${s}</li>`).join('\n          ')
    : '<li>Services professionnels</li>'

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${companyName} — Aperçu</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #f8fafc; }
    .hero { background: linear-gradient(135deg, #1e293b, #0f172a); padding: 60px 20px; text-align: center; }
    .hero h1 { font-size: 2.5rem; margin-bottom: 12px; background: linear-gradient(90deg, #3b82f6, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .hero .industry { color: #94a3b8; font-size: 1.1rem; margin-bottom: 8px; }
    .hero .desc { color: #cbd5e1; max-width: 600px; margin: 0 auto; line-height: 1.6; }
    .section { padding: 40px 20px; max-width: 800px; margin: 0 auto; }
    .section h2 { font-size: 1.5rem; margin-bottom: 20px; color: #3b82f6; }
    .services-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
    .service-card { background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 16px; }
    .hours { background: rgba(30, 41, 59, 0.5); border-radius: 12px; padding: 20px; margin-top: 20px; }
    .cta { text-align: center; padding: 40px 20px; }
    .cta-button { display: inline-block; background: linear-gradient(90deg, #3b82f6, #8b5cf6); color: white; padding: 16px 32px; border-radius: 12px; font-size: 1.1rem; text-decoration: none; font-weight: 600; }
    .badge { display: inline-block; background: rgba(59, 130, 246, 0.2); color: #60a5fa; padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="hero">
    <span class="badge">Aperçu de votre futur site</span>
    <h1>${companyName}</h1>
    <p class="industry">${extractedData.industry}</p>
    <p class="desc">${extractedData.description}</p>
  </div>

  <div class="section">
    <h2>Nos Services</h2>
    <div class="services-grid">
      ${services.map((s) => `<div class="service-card">${s}</div>`).join('\n      ')}
    </div>
  </div>

  ${extractedData.hours ? `
  <div class="section">
    <h2>Horaires</h2>
    <div class="hours">${extractedData.hours}</div>
  </div>
  ` : ''}

  <div class="cta">
    <p style="color: #94a3b8; margin-bottom: 16px;">Ce site a été généré automatiquement par DCG AI</p>
    <a href="#" class="cta-button">Discuter avec notre IA</a>
  </div>
</body>
</html>`
}
