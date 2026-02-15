import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const PUBLISH_COST = 150

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
    }

    const body = await req.json()

    // Client admin (bypass RLS)
    const adminSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verifier si l'utilisateur est admin
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'

    // Verifier si l'utilisateur a deja un site
    const { data: existingSite } = await adminSupabase
      .from('mini_sites')
      .select('id, slug, published')
      .eq('profile_id', user.id)
      .single()

    const slug = body.slug || existingSite?.slug || slugify(body.business_name || 'mon-site')

    // Premiere publication = 150 credits
    const isFirstPublish = body.first_publish && body.published && !existingSite?.published
    let creditsRemaining: number | undefined

    if (isFirstPublish && !isAdmin) {
      const { data: creditData } = await adminSupabase
        .from('credits')
        .select('balance, lifetime_spent')
        .eq('profile_id', user.id)
        .single()

      if (!creditData || creditData.balance < PUBLISH_COST) {
        return NextResponse.json(
          { error: `Credits insuffisants. ${PUBLISH_COST} credits requis pour publier.` },
          { status: 402 }
        )
      }

      // Deduire les credits
      await adminSupabase
        .from('credits')
        .update({
          balance: creditData.balance - PUBLISH_COST,
          lifetime_spent: (creditData.lifetime_spent || 0) + PUBLISH_COST,
        })
        .eq('profile_id', user.id)

      await adminSupabase
        .from('credit_transactions')
        .insert({
          profile_id: user.id,
          amount: -PUBLISH_COST,
          type: 'spend',
          description: 'Mini Site Vitrine - Publication',
        })

      creditsRemaining = creditData.balance - PUBLISH_COST
    }

    const siteData = {
      profile_id: user.id,
      slug,
      business_name: body.business_name,
      business_type: body.business_type || null,
      slogan: body.slogan || null,
      logo_url: body.logo_url || null,
      services: body.services || [],
      phone: body.phone || null,
      email: body.email || null,
      address: body.address || null,
      opening_hours: body.opening_hours || {},
      gallery_urls: body.gallery_urls || [],
      facebook_url: body.facebook_url || null,
      instagram_url: body.instagram_url || null,
      tiktok_url: body.tiktok_url || null,
      youtube_url: body.youtube_url || null,
      whatsapp_number: body.whatsapp_number || null,
      theme: body.theme || 'tropical_creole',
      accent_color: body.accent_color || '#E67E22',
      font_style: body.font_style || 'moderne',
      services_layout: body.services_layout || 'cards',
      sections_order: body.sections_order || ['hero', 'about', 'services', 'gallery', 'hours', 'contact', 'social'],
      hero_config: body.hero_config || null,
      ai_description: body.ai_description || null,
      hero_image_url: body.hero_image_url || null,
      published: body.published ?? false,
    }

    if (existingSite) {
      // Mise a jour
      const { error } = await adminSupabase
        .from('mini_sites')
        .update(siteData)
        .eq('id', existingSite.id)

      if (error) {
        console.error('Mini-site update error:', error)
        return NextResponse.json({ error: 'Erreur sauvegarde' }, { status: 500 })
      }
    } else {
      // Creation
      const { error } = await adminSupabase
        .from('mini_sites')
        .insert(siteData)

      if (error) {
        console.error('Mini-site insert error:', error)
        // Si le slug est deja pris, ajouter un suffixe
        if (error.code === '23505') {
          siteData.slug = `${slug}-${Date.now().toString(36).slice(-4)}`
          const { error: retryError } = await adminSupabase
            .from('mini_sites')
            .insert(siteData)

          if (retryError) {
            return NextResponse.json({ error: 'Erreur creation du site' }, { status: 500 })
          }
        } else {
          return NextResponse.json({ error: 'Erreur creation du site' }, { status: 500 })
        }
      }
    }

    return NextResponse.json({
      success: true,
      slug: siteData.slug,
      credits_remaining: creditsRemaining,
    })
  } catch (error) {
    console.error('Mini-site save error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
