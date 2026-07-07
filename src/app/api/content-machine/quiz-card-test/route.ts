import { renderQuizCardPng } from '@/lib/content-machine/spp-quiz-card'

const CRON_SECRET = process.env.CRON_SECRET

/**
 * Aperçu de la carte « QCM du jour » (contrôle visuel, aucune écriture).
 * GET /api/content-machine/quiz-card-test?q=…&o=opt1|opt2|opt3|opt4
 * Protégé par le même secret que les crons de la machine.
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const auth = req.headers.get('authorization')
  const cronHeader = req.headers.get('x-cron-secret')
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}` && cronHeader !== CRON_SECRET) {
    return new Response('Non autorisé', { status: 401 })
  }

  const question =
    url.searchParams.get('q') ||
    'Quel est le grade le plus élevé chez les sapeurs-pompiers professionnels non officiers ?'
  const options = (url.searchParams.get('o') || 'Sergent|Adjudant|Caporal-chef|Lieutenant').split('|')
  const grade = url.searchParams.get('grade') || 'Caporal externe'

  const png = await renderQuizCardPng({ gradeLabel: grade, question, options })
  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' },
  })
}
