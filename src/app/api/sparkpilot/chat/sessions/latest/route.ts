/**
 * GET /api/sparkpilot/chat/sessions/latest
 *
 * Renvoie la session de chat la plus récente de l'utilisateur connecté
 * pour pré-remplir l'historique côté UI quand on ouvre le drawer.
 *
 * Réponses :
 *   - 200 { session: null }            → user n'a jamais chatté
 *   - 200 { session: {...} }           → dernière session récupérée
 *   - 401                              → non authentifié
 */

import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

import { createClient } from '@/lib/supabase/server'
import type { ChatMessage } from '@/lib/sparkpilot/chat/claude-stream'

export const runtime = 'nodejs'

interface ChatSessionRow {
  id: string
  plan_id: string | null
  task_id: string | null
  context_url: string | null
  messages: ChatMessage[] | null
  created_at: string
  updated_at: string
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('sparkpilot_chat_sessions')
    .select(
      'id, plan_id, task_id, context_url, messages, created_at, updated_at',
    )
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle<ChatSessionRow>()

  if (error) {
    Sentry.captureException(error, {
      tags: { feature: 'sparkpilot-chat', step: 'session-latest' },
    })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ session: null })
  }

  return NextResponse.json({
    session: {
      id: data.id,
      plan_id: data.plan_id,
      task_id: data.task_id,
      context_url: data.context_url,
      messages: Array.isArray(data.messages) ? data.messages : [],
      created_at: data.created_at,
      updated_at: data.updated_at,
    },
  })
}
