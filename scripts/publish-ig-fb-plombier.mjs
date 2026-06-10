// Décline l'étude de cas "Marc plombier" sur Instagram (dcg.ai) et Facebook (DCG AI),
// même visuel, captions adaptées par réseau, programmées le 09/06.
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
const IMG = fs.readFileSync(path.resolve('scripts/_preview-plombier.url.txt'), 'utf8').trim()
const BOOKING = 'https://digital-code-growth.com/rdv'
const DEMO_TEL = '09 39 24 39 15' // ligne démo vocale (source : dcg-ai-wiki/canal-vocal.md)

const FB_ID = '69eff38b1cb49d39b605e633_15W1kS8V6KqgTPhtzaPZ_104041555416160_page'
const IG_ID = '69eff3ee5e7fe87daffe93ca_15W1kS8V6KqgTPhtzaPZ_17841450347721638'

// --- Facebook : 09/06 13h00 GP (= 17h00 UTC), liens cliquables ---
const FB = {
  accountIds: [FB_ID],
  schedule: '2026-06-09T17:00:00.000Z',
  summary: `Un plombier qui rate un appel, c'est un client qui appelle le concurrent. 📞

Marc est plombier à Baie-Mahault. Il travaille seul, les mains dans l'eau toute la journée.

Son téléphone sonne pendant qu'il est sous un évier. Il ne peut pas répondre. Et un client pressé ne laisse pas de message : il appelle le plombier suivant.

Le soir, Marc rappelle ses 8 appels manqués. Trop tard. Les rendez-vous sont déjà pris ailleurs.

Le problème, ce n'est pas son travail. C'est qu'il ne peut être qu'à un endroit à la fois.

👉 Une secrétaire ? 2 200 € par mois, et elle s'arrête à 17h.

Alors Marc a mis une assistante IA. Un client écrit sur WhatsApp à 7h40 ? Elle répond en 10 secondes et pose le rendez-vous. Un dégât des eaux à 21h ? Elle répond aussi.

Le soir, Marc n'a plus 8 appels manqués. Il a 8 rendez-vous déjà posés. ✅

197 € par mois. 24h/24. 11 fois moins cher qu'une secrétaire, et elle ne dort jamais.

(Exemple illustratif — mais tu reconnais la situation, non ?)

📅 On en parle ? Réserve ta démo : ${BOOKING}`,
}

// --- Instagram : 09/06 19h00 GP (= 23h00 UTC), liens NON cliquables → CTA appel démo + DM ---
const IG = {
  accountIds: [IG_ID],
  schedule: '2026-06-09T23:00:00.000Z',
  summary: `Rater un appel = perdre un client. 📞

Marc, plombier à Baie-Mahault, bosse seul. 🔧
Les mains dans l'eau toute la journée.

Le téléphone sonne… il ne peut pas répondre.
Le client n'attend pas : il appelle le plombier d'à côté. 😤

Le soir : 8 appels manqués à rappeler. Trop tard.

Une secrétaire ? 2 200 €/mois. Impossible. Et elle s'arrête à 17h.

Alors Marc a mis une assistante IA. 🤖
✅ 7h40, sur un chantier → un client écrit, elle répond en 10 sec et pose le RDV
✅ 21h, un dégât des eaux → elle répond encore
✅ Le soir : 8 RDV déjà posés, plus aucun appel manqué

💶 197 €/mois. 24h/24. 11 fois moins cher qu'une secrétaire.

(Exemple illustratif — mais tu te reconnais, non ? 😉)

👉 Tu veux l'ENTENDRE en vrai ? Appelle notre assistante IA : ${DEMO_TEL}
💬 Ou écris-nous en message privé, on te montre tout.

#Guadeloupe #Artisan #Plombier #971 #IntelligenceArtificielle #DCGAI #EntrepreneurGuadeloupe #PetiteEntreprise`,
}

async function post(label, cfg) {
  const body = {
    type: 'post',
    accountIds: cfg.accountIds,
    userId: USER,
    summary: cfg.summary,
    media: [{ url: IMG, type: 'image/png' }],
    scheduleDate: cfg.schedule,
    status: 'scheduled',
  }
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
  console.log(`${label}: HTTP ${r.status} | ${r.status === 201 ? '✅ programmé ' + cfg.schedule : '❌ ' + JSON.stringify(j).slice(0, 300)}`)
}

await post('FACEBOOK (DCG AI)', FB)
await post('INSTAGRAM (dcg.ai)', IG)
