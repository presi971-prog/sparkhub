import { createAdminClient, createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendRejectionEmail } from '@/lib/notifications'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { reason } = await req.json()

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

  // Update pending registration status
  const { error } = await adminSupabase
    .from('pending_registrations')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      rejection_reason: reason || 'N° Cobeone invalide'
    })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Send rejection email
  try {
    await sendRejectionEmail(
      pending.email,
      pending.full_name,
      reason || 'N° Cobeone invalide'
    )
  } catch (emailError) {
    console.error('Failed to send rejection email:', emailError)
  }

  return NextResponse.json({ success: true })
}
