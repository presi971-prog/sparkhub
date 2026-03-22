import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://sparkhub.digital-code-growth.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/tableau-de-bord/', '/outils/', '/profil/', '/credits/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
