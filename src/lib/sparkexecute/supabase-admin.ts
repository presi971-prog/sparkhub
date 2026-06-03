/**
 * SparkExecute — client Supabase service_role (sans cookies).
 *
 * Pourquoi un client à part : l'orchestrateur tourne en fire-and-forget
 * (lancé par la route POST /runs sans await), donc le contexte cookies()
 * de Next.js peut ne plus être disponible.
 *
 * Ce client utilise directement la clé service_role, BYPASSE RLS — à utiliser
 * UNIQUEMENT côté serveur, jamais exposer au client.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key'

/**
 * Client Supabase service_role pour SparkExecute. Bypasse RLS.
 * À utiliser dans l'orchestrateur et les générateurs (visual upload Storage).
 */
export function createSparkExecuteAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })
}
