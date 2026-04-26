import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * Client Supabase admin (service role) pour les API routes Content Machine.
 * Bypass RLS - a utiliser UNIQUEMENT cote serveur.
 */
export function createAdminSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey)
}
