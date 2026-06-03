/**
 * Page détail d'un run SparkExecute.
 *
 * Server Component qui charge le run + déconnecte le rendu client (RunDetailView)
 * qui gère l'édition du contenu et les actions (valider, refaire, archiver, publier).
 *
 * Sécurité : si pas authentifié → layout redirige. Si run inexistant ou pas
 * à l'user → 404.
 */

import { notFound } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import type { SparkexecuteRun } from '@/lib/sparkexecute/types'

import { RunDetailView } from './run-detail-view'

export const dynamic = 'force-dynamic'

const RUN_COLUMNS =
  'id, user_id, task_id, type, framework_used, input_brief, output, status, cost_usd, tokens_input, tokens_output, error_message, metadata, created_at, validated_at, published_at, updated_at'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function RunDetailPage({ params }: PageProps) {
  const { id } = await params
  if (!id) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: run, error } = await supabase
    .from('sparkexecute_runs')
    .select(RUN_COLUMNS)
    .eq('id', id)
    .maybeSingle<SparkexecuteRun>()

  if (error || !run) notFound()

  return <RunDetailView initialRun={run} />
}
