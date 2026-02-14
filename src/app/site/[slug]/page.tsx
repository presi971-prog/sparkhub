import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { SiteRenderer } from './site-renderer'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const { data: site } = await supabase
    .from('mini_sites')
    .select('business_name, slogan, ai_description, hero_image_url')
    .eq('slug', slug)
    .eq('published', true)
    .single()

  if (!site) {
    return { title: 'Site introuvable' }
  }

  const description = site.slogan || site.ai_description?.slice(0, 160) || `${site.business_name} - Site vitrine`

  return {
    title: `${site.business_name} | SparkHub`,
    description,
    openGraph: {
      title: site.business_name,
      description,
      images: site.hero_image_url ? [{ url: site.hero_image_url, width: 1200, height: 630 }] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: site.business_name,
      description,
    },
  }
}

export default async function SitePage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: site } = await supabase
    .from('mini_sites')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .single()

  if (!site) {
    notFound()
  }

  return <SiteRenderer site={site} />
}
