import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { sendUserPendingEmail, sendAdminNewRegistrationAlert } from '@/lib/notifications'

export async function POST(req: Request) {
  const data = await req.json()

  // Validate required fields
  const requiredFields = ['email', 'password', 'fullName', 'cobeoneId', 'cobeoneType', 'userType']
  for (const field of requiredFields) {
    if (!data[field]) {
      return NextResponse.json(
        { error: `${field} is required` },
        { status: 400 }
      )
    }
  }

  const supabase = await createAdminClient()

  // Check if email already exists
  const { data: existingEmail } = await supabase
    .from('pending_registrations')
    .select('id')
    .eq('email', data.email)
    .single()

  if (existingEmail) {
    return NextResponse.json(
      { error: 'Une demande avec cet email existe déjà' },
      { status: 400 }
    )
  }

  // Check if email exists in profiles
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', data.email)
    .single()

  if (existingProfile) {
    return NextResponse.json(
      { error: 'Un compte avec cet email existe déjà' },
      { status: 400 }
    )
  }

  // Hash password
  const passwordHash = await bcrypt.hash(data.password, 10)

  // Create pending registration
  const { data: pending, error } = await supabase
    .from('pending_registrations')
    .insert({
      email: data.email,
      password_hash: passwordHash,
      full_name: data.fullName,
      phone: data.phone || null,
      cobeone_id: data.cobeoneId,
      cobeone_app: data.cobeoneType,
      user_type: data.userType,
      // Livreur fields
      vehicle_type: data.vehicleType || null,
      vehicle_brand: data.vehicleBrand || null,
      vehicle_model: data.vehicleModel || null,
      license_plate: data.licensePlate || null,
      zones: data.zones || null,
      // Pro fields
      company_name: data.companyName || null,
      siret: data.siret || null,
      address: data.address || null,
      sector: data.sector || null
    })
    .select()
    .single()

  if (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'inscription' },
      { status: 500 }
    )
  }

  // Send notifications
  try {
    await Promise.all([
      sendUserPendingEmail(data.email, data.fullName),
      sendAdminNewRegistrationAlert(pending)
    ])
  } catch (emailError) {
    console.error('Failed to send notification emails:', emailError)
  }

  return NextResponse.json({
    success: true,
    message: 'Votre inscription a été reçue. Nous vérifions votre éligibilité (24-48h).'
  })
}
