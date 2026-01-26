'use client'

import { createBrowserClient } from '@supabase/ssr'

// Use fallback values for build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Use any for now until types are generated with `supabase gen types`
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createClient() {
  return createBrowserClient<any>(supabaseUrl, supabaseAnonKey)
}
