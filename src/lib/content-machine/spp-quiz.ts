/**
 * « QCM du jour » Concours SPP — post d'engagement 2×/semaine (lundi, vendredi).
 *
 * RÈGLE ABSOLUE (R0 projet-B) : la question n'est JAMAIS inventée ici. Elle
 * vient de l'endpoint public /api/examiner/decouverte de la plateforme
 * Concours SPP (pipeline officiel : base de connaissances + garde anti-
 * invention + explication). La machine ne fait que la MISE EN FORME.
 *
 * PÉRIMÈTRE : épreuves ÉCRITES uniquement. La plateforme ne prépare pas à
 * l'oral pour le moment (décision Thierry 07/07/2026) : aucun quiz « jury »
 * ou « entretien ».
 *
 * Boucle d'engagement : le post demande la réponse en commentaire ; la bonne
 * réponse + explication partent dans le digest Telegram du matin pour que
 * Thierry la poste EN COMMENTAIRE le soir même (golden hour). Elle est
 * stockée dans cm_contents.video_script (colonne JSON libre, inutilisée pour
 * un quiz) — voir telegram-digest/route.ts qui la lit.
 */

import { renderQuizCardPng } from './spp-quiz-card'

const CONCOURS_SPP_BASE = 'https://concours-spp.digital-code-growth.com'

/** Concours proposés en quiz (épreuves écrites : PAS d'oral/entretien). */
export const QUIZ_FORMATIONS = [
  { code: 'caporal_externe', label: 'Caporal externe', hashtag: 'caporal' },
  { code: 'caporal_spv', label: 'Caporal SPV', hashtag: 'caporal' },
  { code: 'sergent', label: 'Sergent', hashtag: 'sergent' },
  { code: 'lieutenant_2cl', label: 'Lieutenant 2e classe', hashtag: 'lieutenant' },
  { code: 'lieutenant_1cl', label: 'Lieutenant 1re classe', hashtag: 'lieutenant' },
  { code: 'capitaine', label: 'Capitaine', hashtag: 'capitaine' },
] as const

export type QuizFormation = (typeof QUIZ_FORMATIONS)[number]

/**
 * Rotation déterministe des concours (même logique que metiersForWeek :
 * pas de Math.random, reproductible quel que soit le jour de régénération).
 * 2 quiz/semaine → on avance de 2 dans la liste chaque semaine, le quiz du
 * vendredi prend le concours suivant celui du lundi.
 */
export function quizFormationForDate(date: Date, isoWeek: number): QuizFormation {
  const isoDay = date.getUTCDay() === 0 ? 7 : date.getUTCDay()
  const slot = isoDay >= 5 ? 1 : 0 // lundi → 0, vendredi → 1
  return QUIZ_FORMATIONS[(isoWeek * 2 + slot) % QUIZ_FORMATIONS.length]
}

/** Thème calendrier lisible + code machine parsable : « QCM du jour — Sergent [sergent] ». */
export function quizTheme(f: QuizFormation): string {
  return `QCM du jour — ${f.label} [${f.code}]`
}

export function parseQuizTheme(theme: string): QuizFormation {
  const m = theme.match(/\[([a-z0-9_]+)\]\s*$/)
  const found = QUIZ_FORMATIONS.find((f) => f.code === m?.[1])
  return found ?? QUIZ_FORMATIONS[0]
}

export interface VerifiedQuizQuestion {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

/**
 * Va chercher UNE question vérifiée sur la plateforme (endpoint public,
 * même pipeline que le quiz découverte du site).
 */
export async function fetchVerifiedQuizQuestion(
  formationCode: string,
): Promise<VerifiedQuizQuestion> {
  const resp = await fetch(`${CONCOURS_SPP_BASE}/api/examiner/decouverte`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ formation: formationCode, count: 1 }),
  })
  if (!resp.ok) {
    throw new Error(`Plateforme Concours SPP HTTP ${resp.status} : quiz non généré.`)
  }
  const data = (await resp.json()) as {
    qcm?: {
      questions?: {
        question?: string
        options?: string[]
        correct_answers?: number[]
        explanation?: string
      }[]
    }
  }
  const q = data.qcm?.questions?.[0]
  if (
    !q?.question ||
    !Array.isArray(q.options) ||
    q.options.length < 2 ||
    !Array.isArray(q.correct_answers) ||
    typeof q.correct_answers[0] !== 'number' ||
    q.correct_answers[0] < 0 ||
    q.correct_answers[0] >= q.options.length
  ) {
    throw new Error('Réponse plateforme invalide (question/options/réponse manquantes).')
  }
  return {
    question: q.question.trim(),
    options: q.options.map((o) => String(o).trim()),
    correctIndex: q.correct_answers[0],
    explanation: (q.explanation ?? '').trim(),
  }
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

/**
 * Légende du post. Pas de lien (post d'engagement : un lien tue la portée
 * organique Facebook, référentiel v2.0) ; la question et les options sont
 * répétées en texte pour l'accessibilité et la recherche.
 */
export function buildQuizCaption(f: QuizFormation, q: VerifiedQuizQuestion): string {
  const optionLines = q.options.map((opt, i) => `${LETTERS[i]}. ${opt}`).join('\n')
  return `🧠 QCM du jour — concours de ${f.label.toLowerCase()}

${q.question}

${optionLines}

💬 Ta réponse (${LETTERS.slice(0, q.options.length).join(', ')}) en commentaire 👇
✅ Réponse et explication ce soir en commentaire.

#concourspompier #sapeurpompier #concoursspp #QCM #${f.hashtag}`
}

/** Ce qui part dans cm_contents.video_script pour le digest Telegram. */
export interface QuizAnswerRecord {
  kind: 'spp_quiz'
  formation: string
  question: string
  correct_letter: string
  correct_option: string
  explanation: string
}

/**
 * Pipeline complet d'une entrée calendrier `quiz` : question vérifiée →
 * carte PNG → upload storage → cm_contents + cm_assets → calendrier `generated`.
 * Appelé par generate-daily ; toute erreur marque l'entrée en échec (jamais
 * de faux succès, leçon du 04/07).
 */
export async function generateSppQuizContent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  entry: { id: string; brand_id: string; theme: string },
  brandSlug: string,
): Promise<void> {
  const formation = parseQuizTheme(entry.theme)
  const q = await fetchVerifiedQuizQuestion(formation.code)

  const png = await renderQuizCardPng({
    gradeLabel: formation.label,
    question: q.question,
    options: q.options,
  })

  const today = new Date().toISOString().split('T')[0]
  const storagePath = `${brandSlug}/${today}/${Date.now()}-quiz.png`
  const { error: uploadError } = await supabase.storage
    .from('content-machine')
    .upload(storagePath, png, { contentType: 'image/png', upsert: false })
  if (uploadError) {
    throw new Error(`Upload carte quiz impossible : ${uploadError.message}`)
  }
  const { data: pub } = supabase.storage.from('content-machine').getPublicUrl(storagePath)

  const answer: QuizAnswerRecord = {
    kind: 'spp_quiz',
    formation: formation.label,
    question: q.question,
    correct_letter: LETTERS[q.correctIndex],
    correct_option: q.options[q.correctIndex],
    explanation: q.explanation,
  }

  const { data: content, error: contentError } = await supabase
    .from('cm_contents')
    .insert({
      brand_id: entry.brand_id,
      calendar_id: entry.id,
      content_type: 'quiz',
      text_content: buildQuizCaption(formation, q),
      text_prompt: `Theme: ${entry.theme}`,
      image_prompts: [],
      video_script: JSON.stringify(answer),
      status: 'pending',
    })
    .select()
    .single()
  if (contentError) throw new Error(`Erreur cm_contents: ${contentError.message}`)

  await supabase.from('cm_assets').insert({
    content_id: content.id,
    type: 'image',
    storage_path: storagePath,
    public_url: pub.publicUrl,
    prompt: `Carte QCM du jour — ${formation.label}`,
    position: 0,
  })

  await supabase.from('cm_calendar').update({ status: 'generated' }).eq('id', entry.id)
}
