/**
 * Page "Nouveau livrable" — création manuelle (sans tâche SparkPilot d'origine).
 *
 * Flow en 2 étapes :
 *   1. Sélection du type (grille de 10 cards, 3 actives en V1)
 *   2. Formulaire brief (sujet, audience, ton, mots-clés, longueur)
 *
 * Server Component : charge les suggestions issues du DERNIER SCAN SparkScan
 * (questions clients posées aux IA + mots-clés à renforcer) et les passe au
 * wizard client. La mesure alimente la production : plus besoin de deviner
 * ses sujets, le scan les propose.
 */

import { createClient } from '@/lib/supabase/server'
import { NewRunWizard, type ScanSuggestions } from './new-run-wizard'

export const metadata = {
  title: 'Créer un livrable',
}

export const dynamic = 'force-dynamic'

function hostOf(url: string): string {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(
      /^www\./,
      '',
    )
  } catch {
    return url
  }
}

export default async function NouveauRunPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let suggestions: ScanSuggestions | null = null

  if (user) {
    // Dernier scan terminé de l'utilisateur = source des suggestions
    const { data: lastScan } = await supabase
      .from('sparkscan_scans')
      .select('id, input_url, geo_citations')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastScan) {
      // 1. Les questions que de vrais clients posent aux IA (Perplexity) :
      //    des sujets d'articles prêts à l'emploi.
      const topics: string[] = Array.isArray(
        (lastScan.geo_citations as { questions_asked?: string[] } | null)
          ?.questions_asked,
      )
        ? ((lastScan.geo_citations as { questions_asked: string[] }).questions_asked ?? [])
            .filter((q) => typeof q === 'string' && q.trim().length > 0)
            .slice(0, 5)
        : []

      // 2. Les mots-clés où le site ranke DÉJÀ mais pas premier (positions
      //    4-20) : écrire dessus est le levier le plus rentable.
      const { data: kwRows } = await supabase
        .from('sparkscan_keywords')
        .select('keyword, position')
        .eq('scan_id', lastScan.id)
        .gte('position', 4)
        .order('position', { ascending: true })
        .limit(8)

      const keywords = (kwRows ?? []) as { keyword: string; position: number }[]

      if (topics.length > 0 || keywords.length > 0) {
        suggestions = {
          host: hostOf(lastScan.input_url),
          topics,
          keywords,
        }
      }
    }
  }

  return <NewRunWizard scanSuggestions={suggestions} />
}
