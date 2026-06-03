/**
 * Route SparkExecute — comptes RS connectés dans GHL Social Planner.
 *
 *   GET /api/sparkexecute/social-accounts
 *
 * Sert à l'UI :
 *   - modal Publier : "LinkedIn ✅ connecté" / "❌ non connecté"
 *   - page Réglages : voir l'inventaire des comptes connectés
 *
 * Réponse :
 *   {
 *     pit_configured: boolean,
 *     accounts: {
 *       linkedin?: SocialAccount[],
 *       instagram?: SocialAccount[],
 *       facebook?: SocialAccount[],
 *       google_business?: SocialAccount[],
 *       ...
 *     },
 *     error?: string
 *   }
 *
 * On ne propage JAMAIS le PIT côté réponse, juste un booléen pit_configured.
 */

import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import {
  isGhlPitConfigured,
} from '@/lib/sparkexecute/publishers/ghl-client'
import {
  listConnectedSocialAccounts,
} from '@/lib/sparkexecute/publishers/ghl-social'

export async function GET() {
  // Auth obligatoire : on ne veut pas exposer publiquement la liste des
  // comptes sociaux DCG AI.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const pitConfigured = isGhlPitConfigured()
  if (!pitConfigured) {
    return NextResponse.json({
      pit_configured: false,
      accounts: {},
      error:
        'Le compte GHL n\'est pas connecté côté serveur. Ajoute GHL_DCGAI_PIT.',
    })
  }

  try {
    const accounts = await listConnectedSocialAccounts()
    return NextResponse.json({
      pit_configured: true,
      accounts,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({
      pit_configured: true,
      accounts: {},
      error: message,
    })
  }
}
