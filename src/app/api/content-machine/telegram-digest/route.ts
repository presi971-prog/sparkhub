import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/content-machine/supabase-admin'

const CRON_SECRET = process.env.CRON_SECRET
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID

const PLATFORM_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  google_business: 'Fiche Google',
  tiktok: 'TikTok',
  youtube: 'YouTube',
}

/** Même règle d'auth que generate-daily/rescan-weekly : Bearer ou header x-cron-secret. */
function verifyCronAuth(req: Request): boolean {
  const authHeader = req.headers.get('authorization')
  if (authHeader === `Bearer ${CRON_SECRET}`) return true
  const cronHeader = req.headers.get('x-cron-secret')
  return cronHeader === CRON_SECRET
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Guadeloupe',
  })
}

interface CalendarRow {
  id: string
  date: string
  content_type: string
  theme: string
  brand: { name: string; slug: string } | { name: string; slug: string }[] | null
  cm_contents: {
    status: string
    pushed_at: string | null
    push_results: {
      scheduled?: { platform: string; at: string }[]
      errors?: { platform: string; error: string }[]
      blog?: { post_id: number; url: string }
    } | null
    /** Pour un quiz : JSON QuizAnswerRecord (réponse + explication), voir spp-quiz.ts. */
    video_script: string | null
  }[]
}

/** Ligne « réponse à poster ce soir » pour un QCM du jour (Concours SPP). */
function quizAnswerLine(videoScript: string | null): string | null {
  if (!videoScript) return null
  try {
    const a = JSON.parse(videoScript) as {
      kind?: string
      correct_letter?: string
      correct_option?: string
      explanation?: string
    }
    if (a.kind !== 'spp_quiz' || !a.correct_letter) return null
    const expl = a.explanation ? ` — ${a.explanation}` : ''
    return `  ↳ À poster CE SOIR en commentaire : ✅ ${a.correct_letter}. ${a.correct_option}${expl}`
  } catch {
    return null
  }
}

/** Construit le texte du digest (une ligne par contenu du jour, groupée par marque). */
function buildMessage(rows: CalendarRow[]): string {
  if (rows.length === 0) {
    return `🗞 Machine de visibilité — aujourd'hui\n\nRien de programmé aujourd'hui.`
  }

  const byBrand = new Map<string, string[]>()

  for (const row of rows) {
    const brand = Array.isArray(row.brand) ? row.brand[0] : row.brand
    const brandName = brand?.name ?? '?'
    const content = row.cm_contents?.[0]
    const results = content?.push_results

    let line: string
    if (row.content_type === 'blog_article') {
      line = results?.blog
        ? `• Blog : ${row.theme} — publié ce matin`
        : `• Blog : ${row.theme} — pas encore publié`
    } else if (!content?.pushed_at) {
      line = `• ${row.theme} — pas encore programmé`
    } else {
      const scheduled = results?.scheduled ?? []
      const errors = results?.errors ?? []
      const nets = scheduled
        .slice()
        .sort((a, b) => a.at.localeCompare(b.at))
        .map((s) => `${PLATFORM_LABELS[s.platform] ?? s.platform} ${fmtTime(s.at)}`)
        .join(', ')
      const errPart = errors.length
        ? ` ⚠️ échec : ${errors.map((e) => PLATFORM_LABELS[e.platform] ?? e.platform).join(', ')}`
        : ''
      line = `• ${row.theme} — ${nets || 'rien programmé'}${errPart}`
    }

    const list = byBrand.get(brandName) ?? []
    list.push(line)
    // QCM du jour : la bonne réponse suit, pour que Thierry la poste en
    // commentaire le soir même (golden hour) — jamais dans le post lui-même.
    if (row.content_type === 'quiz') {
      const answer = quizAnswerLine(content?.video_script ?? null)
      if (answer) list.push(answer)
    }
    byBrand.set(brandName, list)
  }

  const sections = Array.from(byBrand.entries())
    .map(([brand, lines]) => `${brand}\n${lines.join('\n')}`)
    .join('\n\n')

  return `🗞 Machine de visibilité — aujourd'hui (heures Guadeloupe)\n\n${sections}`
}

async function sendTelegram(text: string): Promise<{ ok: boolean; error?: string }> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return { ok: false, error: 'TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID manquant' }
  }
  try {
    const r = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }),
    })
    if (!r.ok) return { ok: false, error: `Telegram HTTP ${r.status}: ${(await r.text()).slice(0, 200)}` }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur réseau Telegram' }
  }
}

export async function GET(req: Request) {
  if (CRON_SECRET && !verifyCronAuth(req)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const supabase = createAdminSupabase()
  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('cm_calendar')
    .select('id, date, content_type, theme, brand:cm_brands(name, slug), cm_contents(status, pushed_at, push_results, video_script)')
    .eq('date', today)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const message = buildMessage((data ?? []) as CalendarRow[])
  const dryRun = new URL(req.url).searchParams.get('dry') === '1'

  if (dryRun) {
    return NextResponse.json({ message, sent: false, dryRun: true })
  }

  const result = await sendTelegram(message)
  return NextResponse.json({ message, sent: result.ok, error: result.error })
}
