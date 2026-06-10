// Programme le post LinkedIn "étude de cas Marc plombier" sur le compte
// DCG AI "Digital Code Growth", avec le visuel généré, pour le 09/06 7h30 GP.
import fs from 'node:fs'
import path from 'node:path'

const envText = fs.readFileSync(path.resolve('.env.local'), 'utf8')
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const LOC = process.env.GHL_DCGAI_LOCATION_ID || '15W1kS8V6KqgTPhtzaPZ'
const PIT = process.env.GHL_DCGAI_PIT
const USER = process.env.GHL_USER_ID
const LINKEDIN_DCG_AI = '69eff525a0fa2223c19c2cf7_15W1kS8V6KqgTPhtzaPZ_74095125_page'
const IMG = fs.readFileSync(path.resolve('scripts/_preview-plombier.url.txt'), 'utf8').trim()
const BOOKING = 'https://digital-code-growth.com/rdv'

// 09/06/2026 07h30 Guadeloupe (UTC-4) = 11h30 UTC
const SCHEDULE = '2026-06-09T11:30:00.000Z'

const SUMMARY = `Un plombier qui rate un appel, c'est un client qui appelle le concurrent. 📞

Marc est plombier à Baie-Mahault. Il travaille seul, les mains dans l'eau toute la journée.

Son téléphone sonne pendant qu'il est sous un évier. Il ne peut pas répondre.

Et un client pressé ne laisse pas de message. Il appelle le plombier suivant.

Le soir, Marc rappelle ses 8 appels manqués. Trop tard. Les rendez-vous sont déjà pris ailleurs.

Le problème n'est pas son travail. C'est qu'il ne peut être qu'à un endroit à la fois.

Embaucher une secrétaire ? 2 200 € par mois. Impossible pour un artisan seul. Et elle s'arrête à 17h.

Alors Marc a mis en place une assistante IA.

→ Lundi 7h40, il est sur un chantier. Un client écrit sur WhatsApp. Elle répond en 10 secondes et pose le rendez-vous.
→ Mardi 21h, un dégât des eaux. Elle répond, rassure, prévient Marc pour le lendemain.
→ Toute la semaine, son téléphone ne le coupe plus.

Le soir, il n'a plus 8 appels manqués. Il a 8 rendez-vous déjà posés.

197 € par mois. 24h/24. 11 fois moins cher qu'une secrétaire — et elle ne dort jamais.

(Exemple illustratif — mais tu reconnais la situation, non ?)

👉 On en parle ? Réserve ta démo : ${BOOKING}

#Guadeloupe #Artisan #IntelligenceArtificielle #DCGAI`

async function main() {
  const body = {
    type: 'post',
    accountIds: [LINKEDIN_DCG_AI],
    userId: USER,
    summary: SUMMARY,
    media: [{ url: IMG, type: 'image/png' }],
    scheduleDate: SCHEDULE,
    status: 'scheduled',
  }
  console.log('Programmation LinkedIn « Digital Code Growth » pour', SCHEDULE, '(= 09/06 7h30 GP)')
  console.log('Image:', IMG)
  const r = await fetch(`https://services.leadconnectorhq.com/social-media-posting/${LOC}/posts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PIT}`,
      Version: '2021-07-28',
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  })
  const j = await r.json().catch(() => ({}))
  console.log('HTTP', r.status)
  const id = j?.data?._id || j?.data?.id || j?._id || j?.id
  if (r.status >= 200 && r.status < 300) {
    console.log('✅ PROGRAMMÉ — post id =', id)
    console.log('status renvoyé =', j?.data?.status)
  } else {
    console.log('❌ ÉCHEC:', JSON.stringify(j).slice(0, 500))
    process.exit(1)
  }
}
main().catch(e => { console.error('ERREUR:', e.message); process.exit(1) })
