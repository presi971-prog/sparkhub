/**
 * SparkScan — true Supabase admin client (service_role) for backend writes.
 *
 * The repo's existing `createAdminClient()` in `@/lib/supabase/server` uses
 * `@supabase/ssr` with cookies + service role key — this hybrid setup
 * sometimes fails to apply service_role privileges on UPDATEs (RLS bypass
 * doesn't work reliably), causing silent zero-row updates.
 *
 * This helper uses `@supabase/supabase-js` directly, no cookies, no auth
 * persistence — pure backend admin client. UPDATE/INSERT/DELETE bypass RLS.
 */

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export function getSparkScanAdminClient() {
  if (!url || !serviceKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars required',
    )
  }
  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
