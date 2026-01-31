import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      email,
      password,
      full_name,
      phone,
      role,
      // Livreur specific
      vehicle_type,
      vehicle_brand,
      vehicle_model,
      license_plate,
      siret,
      has_permit,
      has_insurance,
      zones,
      primary_zone,
      // Pro specific
      company_name,
      address,
      sector,
      description,
      delivery_needs,
    } = body

    // Create admin client with service role (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // User must confirm email
      user_metadata: {
        full_name,
        phone,
        role,
      },
    })

    if (authError) {
      console.error('Auth error:', authError)
      if (authError.message.includes('already been registered')) {
        return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 400 })
      }
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Erreur lors de la création du compte' }, { status: 500 })
    }

    const userId = authData.user.id

    // 2. Create profile (with service role, bypasses RLS)
    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      email,
      full_name,
      phone,
      role,
    })

    if (profileError) {
      console.error('Profile error:', profileError)
      // Cleanup: delete the auth user
      await supabase.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'Erreur lors de la création du profil' }, { status: 500 })
    }

    // 2b. Claim founder slot (if available)
    let founderInfo = null
    if (role === 'livreur' || role === 'professionnel') {
      const { data: slotData, error: slotError } = await supabase
        .rpc('claim_founder_slot', {
          p_profile_id: userId,
          p_user_type: role,
        })

      if (slotError) {
        console.error('Founder slot error:', slotError)
      } else if (slotData) {
        const result = Array.isArray(slotData) ? slotData[0] : slotData
        if (result?.success) {
          founderInfo = {
            slot_number: result.result_slot_number,
            founder_status: result.founder_status,
          }
        }
      }
    }

    // 2c. Add initial points for signup
    await supabase.rpc('add_points', {
      p_profile_id: userId,
      p_points: 10,
      p_action: 'account_created',
      p_description: 'Bienvenue sur SparkHub !',
    })

    // 3. Create role-specific record
    if (role === 'livreur') {
      const { data: livreur, error: livreurError } = await supabase
        .from('livreurs')
        .insert({
          profile_id: userId,
          vehicle_type,
          vehicle_brand: vehicle_brand || null,
          vehicle_model: vehicle_model || null,
          license_plate: license_plate || null,
          siret: siret || null,
          has_permit: has_permit || false,
          has_insurance: has_insurance || false,
        })
        .select('id')
        .single()

      if (livreurError) {
        console.error('Livreur error:', livreurError)
        return NextResponse.json({ error: 'Erreur lors de la création du profil livreur' }, { status: 500 })
      }

      // 4. Create zone associations
      if (zones && zones.length > 0 && livreur) {
        const zonesData = zones.map((communeId: string, index: number) => ({
          livreur_id: livreur.id,
          commune_id: communeId,
          is_primary: primary_zone ? communeId === primary_zone : index === 0,
        }))

        const { error: zonesError } = await supabase.from('zones_livraison').insert(zonesData)

        if (zonesError) {
          console.error('Zones error:', zonesError)
          // Non-blocking error
        }
      }
    } else if (role === 'professionnel') {
      const { error: proError } = await supabase.from('professionnels').insert({
        profile_id: userId,
        company_name,
        siret: siret || null,
        address: address || null,
        sector: sector || null,
        description: description || null,
        delivery_needs: delivery_needs || [],
      })

      if (proError) {
        console.error('Pro error:', proError)
        return NextResponse.json({ error: 'Erreur lors de la création du profil professionnel' }, { status: 500 })
      }
    }

    // 5. Send confirmation email
    const { error: emailError } = await supabase.auth.resend({
      type: 'signup',
      email,
    })

    if (emailError) {
      console.error('Email error:', emailError)
      // Non-blocking
    }

    // Build success message
    let message = 'Inscription réussie ! Vérifiez votre email pour confirmer votre compte.'
    if (founderInfo) {
      const statusLabels: Record<string, string> = {
        platine: 'Platine (50% de réduction)',
        or: 'Or (30% de réduction)',
        argent: 'Argent (20% de réduction)',
        bronze: 'Bronze (10% de réduction)',
      }
      message = `Félicitations ! Vous êtes le fondateur #${founderInfo.slot_number} - ${statusLabels[founderInfo.founder_status] || founderInfo.founder_status}. Vérifiez votre email pour confirmer votre compte.`
    }

    return NextResponse.json({
      success: true,
      message,
      userId,
      founder: founderInfo,
    })

  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}
