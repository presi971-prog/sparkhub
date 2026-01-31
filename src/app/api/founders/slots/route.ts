import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Default values when database isn't set up yet
const DEFAULT_SLOTS = {
  livreur: { total: 100, remaining: 100 },
  professionnel: { total: 100, remaining: 100 }
}

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('get_available_founder_slots')

    if (error) {
      // If the function doesn't exist yet, return default values
      console.warn('Founder slots RPC not available:', error.message)
      return NextResponse.json(DEFAULT_SLOTS)
    }

    return NextResponse.json(data)
  } catch {
    // Fallback for any other errors
    return NextResponse.json(DEFAULT_SLOTS)
  }
}
