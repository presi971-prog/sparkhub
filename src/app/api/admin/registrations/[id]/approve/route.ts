import { createAdminClient, createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendApprovalEmail } from '@/lib/notifications'
import crypto from 'crypto'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const adminSupabase = await createAdminClient()

  // Check if requester is admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (adminProfile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Get pending registration
  const { data: pending, error: pendingError } = await adminSupabase
    .from('pending_registrations')
    .select('*')
    .eq('id', id)
    .single()

  if (pendingError || !pending) {
    return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
  }

  if (pending.status !== 'pending') {
    return NextResponse.json({ error: 'Registration already processed' }, { status: 400 })
  }

  // Create auth user with temporary password
  // User will receive a password reset link
  const tempPassword = crypto.randomBytes(16).toString('hex')

  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email: pending.email,
    password: tempPassword,
    email_confirm: true
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  const userId = authData.user.id

  // Create profile
  const { error: profileError } = await adminSupabase
    .from('profiles')
    .insert({
      id: userId,
      email: pending.email,
      full_name: pending.full_name,
      phone: pending.phone,
      role: pending.user_type,
      cobeone_id: pending.cobeone_id,
      cobeone_app: pending.cobeone_app,
      is_validated: true,
      validated_at: new Date().toISOString()
    })

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  // Create livreur or professionnel record
  if (pending.user_type === 'livreur') {
    await adminSupabase
      .from('livreurs')
      .insert({
        profile_id: userId,
        vehicle_type: pending.vehicle_type,
        vehicle_brand: pending.vehicle_brand,
        vehicle_model: pending.vehicle_model,
        license_plate: pending.license_plate
      })
  } else if (pending.user_type === 'professionnel') {
    await adminSupabase
      .from('professionnels')
      .insert({
        profile_id: userId,
        company_name: pending.company_name,
        siret: pending.siret,
        address: pending.address,
        sector: pending.sector
      })
  }

  // Claim founder slot
  const { data: founderResult } = await adminSupabase.rpc('claim_founder_slot', {
    p_profile_id: userId,
    p_user_type: pending.user_type
  })

  // Award "Nouveau membre" badge and initial points
  await adminSupabase.rpc('add_points', {
    p_profile_id: userId,
    p_points: 10,
    p_action: 'account_created',
    p_description: 'Bienvenue sur SparkHub !'
  })

  // Update pending registration status
  await adminSupabase
    .from('pending_registrations')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id
    })
    .eq('id', id)

  // Send password reset email so user can set their password
  await adminSupabase.auth.admin.generateLink({
    type: 'recovery',
    email: pending.email
  })

  // Send approval notification with founder info
  try {
    await sendApprovalEmail(
      pending.email,
      pending.full_name,
      founderResult?.[0] || null
    )
  } catch (emailError) {
    console.error('Failed to send approval email:', emailError)
  }

  return NextResponse.json({
    success: true,
    userId,
    founder: founderResult?.[0] || null
  })
}
