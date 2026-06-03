'use client'

/**
 * <SparkPilotChat /> — bulle de chat persistante + drawer coach.
 *
 * Composant client (état + streaming SSE). Affiché sur toutes les pages
 * /sparkpilot/* via le layout. Détecte automatiquement la page courante
 * pour enrichir le contexte envoyé à Claude.
 *
 * UX :
 *   - Bulle circulaire 56×56px en bas-droite, fond indigo SparkPilot.
 *   - Au click : drawer 420px à droite (fullscreen sur mobile).
 *   - Suggestions contextuelles selon la page (3 chips cliquables).
 *   - Streaming token par token comme ChatGPT/Claude.ai.
 *   - Conserve le fil pendant la navigation (session_id en état local).
 *
 * R0 respectées :
 *   - Microcopies françaises, tutoiement, langage simple.
 *   - Cohabite avec <HelpButton /> : la bulle chat est à 20px du bas,
 *     le bouton "?" est remonté à 84px par help-button.tsx.
 *   - Pas de console.log oubliés. Pas de any TS.
 */

import { MessageCircle, RefreshCw, Send, Sparkles, X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react'

import type { ChatMessage } from '@/lib/sparkpilot/chat/claude-stream'

/** Mêmes valeurs que côté API — duplication assumée pour découpler. */
type ChatPage =
  | 'dashboard'
  | 'plan'
  | 'task'
  | 'calendrier'
  | 'frameworks'
  | 'unknown'

/** Suggestions par page (R0 langage simple, tutoiement). */
const SUGGESTIONS_BY_PAGE: Record<ChatPage, readonly string[]> = {
  dashboard: [
    'Par quoi je commence ?',
    'Quelle est ma priorité du moment ?',
    "C'est quoi un bon avancement ?",
  ],
  plan: [
    'Quelle priorité attaquer en premier ?',
    "Comment je m'organise ?",
    'Que faire si je bloque ?',
  ],
  task: [
    'Comment je fais ça concrètement ?',
    'Pourquoi cette méthode ?',
    'Combien de temps avant des résultats ?',
  ],
  calendrier: [
    "Comment je m'organise ?",
    'Quelles tâches je peux décaler ?',
    'Comment caler tout ça dans ma semaine ?',
  ],
  frameworks: [
    'Quel framework pour mon métier ?',
    'Lequel commencer ?',
    'Comment choisir entre 2 méthodes ?',
  ],
  unknown: [
    'Par quoi je commence ?',
    'Comment SparkPilot peut maider ?',
    'Donne-moi un conseil rapide',
  ],
}

/** État d'un message en cours de réception (l'assistant qui tape). */
interface StreamingMessage {
  /** Texte accumulé pendant le stream. */
  content: string
  /** True tant que le stream n'a pas envoyé l'event "done". */
  isStreaming: boolean
}

interface ApiSessionPayload {
  session: {
    id: string
    plan_id: string | null
    task_id: string | null
    context_url: string | null
    messages: ChatMessage[]
  } | null
}

export function SparkPilotChat() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState<StreamingMessage | null>(null)
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [hasLoadedSession, setHasLoadedSession] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // ─── Contexte page courante ────────────────────────────────────────
  const { page, planId, taskId } = useMemo(
    () => detectPageContext(pathname),
    [pathname],
  )

  const subtitle = useMemo(() => buildSubtitle(page), [page])
  const suggestions = SUGGESTIONS_BY_PAGE[page]

  // ─── Charge la dernière session au premier ouverture du drawer ─────
  useEffect(() => {
    if (!isOpen || hasLoadedSession) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/sparkpilot/chat/sessions/latest', {
          credentials: 'include',
        })
        if (!res.ok) {
          // Si non auth ou autre erreur, on démarre frais sans bloquer.
          setHasLoadedSession(true)
          return
        }
        const data = (await res.json()) as ApiSessionPayload
        if (cancelled) return
        if (data.session) {
          setSessionId(data.session.id)
          setMessages(data.session.messages)
        }
        setHasLoadedSession(true)
      } catch {
        if (!cancelled) setHasLoadedSession(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isOpen, hasLoadedSession])

  // ─── Auto-scroll en bas dès que les messages ou le stream changent ─
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, streaming])

  // ─── Focus textarea quand on ouvre ─────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      // petit delay pour attendre l'animation d'ouverture
      const id = window.setTimeout(() => {
        textareaRef.current?.focus()
      }, 120)
      return () => window.clearTimeout(id)
    }
  }, [isOpen])

  // ─── Coupe le stream si on quitte le composant ─────────────────────
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  // ─── Envoi d'un message + parsing SSE ──────────────────────────────
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isSending) return

      setError(null)
      setIsSending(true)

      // Optimistic : on affiche immédiatement le message user.
      const userMsg: ChatMessage = {
        role: 'user',
        content: trimmed,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMsg])
      setStreaming({ content: '', isStreaming: true })
      setInput('')

      const controller = new AbortController()
      abortRef.current = controller

      let finalAssistantText = ''
      let receivedSessionId: string | null = sessionId

      try {
        const res = await fetch('/api/sparkpilot/chat', {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            message: trimmed,
            context: {
              page,
              plan_id: planId,
              task_id: taskId,
              page_url: pathname,
            },
          }),
          signal: controller.signal,
        })

        // Cas non-stream : erreur retournée en JSON (auth, quota, 400…).
        const contentType = res.headers.get('content-type') ?? ''
        if (!res.ok || !contentType.includes('text/event-stream')) {
          let msg = `Erreur ${res.status}`
          try {
            const data = (await res.json()) as { error?: string }
            if (data.error) msg = data.error
          } catch {
            /* ignore */
          }
          throw new Error(msg)
        }

        if (!res.body) throw new Error('Réponse vide')
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          let sep: number
          while ((sep = buffer.indexOf('\n\n')) !== -1) {
            const block = buffer.slice(0, sep)
            buffer = buffer.slice(sep + 2)

            let eventName = 'message'
            const dataLines: string[] = []
            for (const line of block.split('\n')) {
              if (line.startsWith('event:')) {
                eventName = line.slice(6).trim()
              } else if (line.startsWith('data:')) {
                dataLines.push(line.slice(5).trim())
              }
            }
            if (dataLines.length === 0) continue
            const dataStr = dataLines.join('\n')

            let parsed: unknown
            try {
              parsed = JSON.parse(dataStr)
            } catch {
              continue
            }

            if (eventName === 'meta') {
              const meta = parsed as { session_id?: string }
              if (meta.session_id) {
                receivedSessionId = meta.session_id
                setSessionId(meta.session_id)
              }
            } else if (eventName === 'delta') {
              const d = parsed as { text?: string }
              if (typeof d.text === 'string') {
                finalAssistantText += d.text
                setStreaming({
                  content: finalAssistantText,
                  isStreaming: true,
                })
              }
            } else if (eventName === 'error') {
              const e = parsed as { error?: string }
              throw new Error(e.error ?? 'Erreur côté coach')
            } else if (eventName === 'done') {
              // On laisse le finalize ci-dessous prendre la main.
            }
          }
        }

        // Commit final : on bascule le streaming → message permanent.
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content:
            finalAssistantText.trim() ||
            '(le coach n\'a pas répondu — réessaie dans un instant)',
          created_at: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, assistantMsg])
        setStreaming(null)
        if (receivedSessionId) setSessionId(receivedSessionId)
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          // Arrêt manuel : on commit ce qu'on a déjà reçu, sans erreur.
          if (finalAssistantText.trim().length > 0) {
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: `${finalAssistantText.trim()} (réponse interrompue)`,
                created_at: new Date().toISOString(),
              },
            ])
          }
          setStreaming(null)
        } else {
          const msg = err instanceof Error ? err.message : String(err)
          setError(msg)
          setStreaming(null)
        }
      } finally {
        setIsSending(false)
        abortRef.current = null
      }
    },
    [isSending, page, pathname, planId, sessionId, taskId],
  )

  // ─── Soumission du formulaire ──────────────────────────────────────
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    void sendMessage(input)
  }

  // ─── Réinitialise une nouvelle conversation ────────────────────────
  const handleNewConversation = () => {
    abortRef.current?.abort()
    setSessionId(null)
    setMessages([])
    setStreaming(null)
    setError(null)
    setInput('')
    // On laisse hasLoadedSession=true pour ne pas re-fetch la session
    // précédente immédiatement.
    setHasLoadedSession(true)
    textareaRef.current?.focus()
  }

  const handleClickSuggestion = (suggestion: string) => {
    void sendMessage(suggestion)
  }

  return (
    <>
      {/* ─── Bulle flottante ─────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Ouvrir le coach SparkPilot"
        title="Pose-moi une question"
        className={`
          group fixed bottom-5 right-5 z-50
          inline-flex h-14 w-14 items-center justify-center
          rounded-full bg-[#4F46E5] text-white
          shadow-[0_10px_30px_-10px_rgba(79,70,229,0.6),0_4px_12px_rgba(15,17,21,0.18)]
          transition hover:scale-[1.04] hover:bg-[#4338CA] hover:shadow-[0_14px_40px_-10px_rgba(79,70,229,0.7)]
          focus:outline-none focus-visible:ring-4 focus-visible:ring-[#4F46E5]/30
          ${isOpen ? 'pointer-events-none opacity-0 scale-90' : 'opacity-100 scale-100'}
        `}
      >
        <MessageCircle className="h-6 w-6" strokeWidth={2} />
        <span
          className="
            pointer-events-none absolute bottom-full right-0 mb-2
            whitespace-nowrap rounded-md border border-[#E9E5D9] bg-white px-2.5 py-1.5
            font-mono text-[10px] uppercase tracking-[0.18em] text-[#22252C]
            opacity-0 shadow-sm transition group-hover:opacity-100
          "
        >
          Pose-moi une question
        </span>
      </button>

      {/* ─── Overlay mobile + drawer ─────────────────────────────── */}
      {isOpen ? (
        <>
          {/* Overlay mobile pour fermer en tapant à côté */}
          <button
            type="button"
            aria-label="Fermer le coach"
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-black/30 sm:bg-black/20"
          />

          <aside
            role="dialog"
            aria-label="Coach SparkPilot"
            className="
              fixed bottom-0 right-0 top-0 z-50 flex h-full w-full flex-col
              border-l border-slate-200 bg-white shadow-2xl
              transition-transform duration-200
              sm:w-[420px]
            "
          >
            {/* Header */}
            <header className="flex items-start justify-between gap-3 border-b border-slate-200 bg-gradient-to-br from-[#EEF0FF] to-white px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#4F46E5] text-white shadow-sm">
                  <Sparkles className="h-4 w-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-[15px] font-semibold text-[#0F1115]">
                    Coach SparkPilot
                  </h2>
                  <p className="mt-0.5 text-[12px] leading-snug text-[#5E626C]">
                    {subtitle}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleNewConversation}
                  aria-label="Démarrer une nouvelle conversation"
                  title="Nouvelle conversation"
                  className="rounded-md p-1.5 text-[#5E626C] transition hover:bg-white hover:text-[#4F46E5]"
                >
                  <RefreshCw className="h-4 w-4" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Fermer"
                  className="rounded-md p-1.5 text-[#5E626C] transition hover:bg-white hover:text-[#0F1115]"
                >
                  <X className="h-5 w-5" strokeWidth={2} />
                </button>
              </div>
            </header>

            {/* Liste des messages */}
            <div
              ref={scrollRef}
              className="flex-1 space-y-3 overflow-y-auto bg-[#FBFAF6] px-4 py-4"
            >
              {messages.length === 0 && !streaming ? (
                <EmptyState page={page} />
              ) : null}
              {messages.map((m, idx) => (
                <MessageBubble key={idx} message={m} />
              ))}
              {streaming ? (
                <MessageBubble
                  message={{
                    role: 'assistant',
                    content: streaming.content || '…',
                  }}
                  isStreaming
                />
              ) : null}
              {error ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-800">
                  {error}
                </div>
              ) : null}
            </div>

            {/* Suggestions au-dessus de la zone de saisie */}
            <div className="border-t border-slate-200 bg-white px-4 pt-3">
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={isSending}
                    onClick={() => handleClickSuggestion(s)}
                    className="
                      rounded-full border border-[#E9E5D9] bg-[#F7F5EF] px-3 py-1.5
                      text-[12px] font-medium text-[#22252C]
                      transition hover:border-[#4F46E5]/40 hover:bg-[#EEF0FF] hover:text-[#4F46E5]
                      disabled:cursor-not-allowed disabled:opacity-50
                    "
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Zone de saisie */}
              <form
                onSubmit={handleSubmit}
                className="mt-3 flex items-end gap-2 pb-4"
              >
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    // Entrée envoie, Shift+Entrée saute une ligne.
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void sendMessage(input)
                    }
                  }}
                  rows={1}
                  placeholder="Pose ta question…"
                  disabled={isSending}
                  className="
                    min-h-[44px] max-h-[140px] flex-1 resize-none
                    rounded-xl border border-slate-200 bg-white px-3 py-2.5
                    text-[14px] leading-snug text-[#0F1115] placeholder:text-[#A8ACB5]
                    transition focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20
                    disabled:cursor-not-allowed disabled:opacity-50
                  "
                />
                <button
                  type="submit"
                  disabled={isSending || input.trim().length === 0}
                  aria-label="Envoyer"
                  className="
                    inline-flex h-11 w-11 flex-shrink-0 items-center justify-center
                    rounded-xl bg-[#4F46E5] text-white shadow-sm
                    transition hover:bg-[#4338CA]
                    disabled:cursor-not-allowed disabled:bg-[#A8ACB5]
                  "
                >
                  <Send className="h-4 w-4" strokeWidth={2} />
                </button>
              </form>
            </div>
          </aside>
        </>
      ) : null}
    </>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// Sous-composants
// ──────────────────────────────────────────────────────────────────────────

function MessageBubble({
  message,
  isStreaming = false,
}: {
  message: Pick<ChatMessage, 'role' | 'content'>
  isStreaming?: boolean
}) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5
          text-[14px] leading-relaxed
          ${
            isUser
              ? 'bg-indigo-100 text-[#1F1B4E] rounded-br-sm'
              : 'bg-white border border-slate-200 text-[#0F1115] rounded-bl-sm shadow-sm'
          }
        `}
      >
        {message.content}
        {isStreaming ? (
          <span className="ml-1 inline-block h-3 w-1.5 animate-pulse rounded-sm bg-[#4F46E5] align-middle" />
        ) : null}
      </div>
    </div>
  )
}

function EmptyState({ page }: { page: ChatPage }) {
  const intro = useMemo(() => {
    switch (page) {
      case 'task':
        return 'Pose-moi une question sur cette tâche : comment la faire, pourquoi, ou les pièges à éviter.'
      case 'plan':
        return 'Demande-moi par où commencer, comment t\'organiser, ou ce qui doit vraiment passer en premier.'
      case 'calendrier':
        return 'Demande-moi comment caler tes tâches dans ta semaine, ou ce que tu peux décaler sans risque.'
      case 'frameworks':
        return 'Demande-moi quel framework correspond à ton métier, ou par lequel commencer.'
      case 'dashboard':
        return 'Demande-moi par quoi commencer, ou quelle est ta priorité du moment.'
      default:
        return "Pose-moi n'importe quelle question sur ton plan marketing."
    }
  }, [page])

  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 px-4 py-5 text-center">
      <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#EEF0FF]">
        <Sparkles className="h-4 w-4 text-[#4F46E5]" strokeWidth={2.2} />
      </div>
      <p className="text-[13px] leading-relaxed text-[#5E626C]">{intro}</p>
      <p className="mt-2 text-[11px] text-[#A8ACB5]">
        Astuce : clique une suggestion en bas pour démarrer en 1 clic.
      </p>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

/**
 * Déduit la page courante + les IDs de contexte depuis le pathname.
 * URLs attendues :
 *   /sparkpilot                          → dashboard
 *   /sparkpilot/plans/<planId>           → plan
 *   /sparkpilot/plans/<planId>/tasks/<taskId> → task (futur)
 *   /sparkpilot/calendrier               → calendrier
 *   /sparkpilot/frameworks(/<framework>) → frameworks
 */
function detectPageContext(pathname: string): {
  page: ChatPage
  planId?: string
  taskId?: string
} {
  if (pathname === '/sparkpilot' || pathname === '/sparkpilot/') {
    return { page: 'dashboard' }
  }
  const taskMatch = pathname.match(
    /^\/sparkpilot\/plans\/([^/]+)\/tasks\/([^/]+)\/?$/,
  )
  if (taskMatch) {
    return { page: 'task', planId: taskMatch[1], taskId: taskMatch[2] }
  }
  const planMatch = pathname.match(/^\/sparkpilot\/plans\/([^/]+)\/?$/)
  if (planMatch) {
    return { page: 'plan', planId: planMatch[1] }
  }
  if (pathname.startsWith('/sparkpilot/calendrier')) {
    return { page: 'calendrier' }
  }
  if (pathname.startsWith('/sparkpilot/frameworks')) {
    return { page: 'frameworks' }
  }
  return { page: 'unknown' }
}

/** Sous-titre du header selon la page (R0 : langage simple). */
function buildSubtitle(page: ChatPage): string {
  switch (page) {
    case 'dashboard':
      return 'Ici pour répondre à tes questions sur ton plan d’action.'
    case 'plan':
      return 'Je connais ce plan — pose-moi tout sur tes priorités.'
    case 'task':
      return 'Je vois la tâche que tu regardes — demande-moi comment la faire.'
    case 'calendrier':
      return 'Je vois ton calendrier — demande-moi comment t’organiser.'
    case 'frameworks':
      return 'Je connais les méthodes du playbook — demande-moi laquelle te va.'
    default:
      return 'Coach marketing pour TPE/PME en Guadeloupe.'
  }
}
