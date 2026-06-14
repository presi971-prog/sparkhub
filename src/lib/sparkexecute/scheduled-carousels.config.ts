// Carrousels éducatifs DCG AI programmés — source de vérité (généré 13/06).
// Consommé par scheduled-carousels.ts : le passage quotidien (cron VPS via
// /api/sparkexecute/publish-scheduled) publie EN IMMÉDIAT le carrousel dont la
// date est arrivée (l'immédiat préserve les 7 slides ; le 'scheduled' GHL les
// écrase à 1 — limite vérifiée le 13/06). Idempotent.

export interface ScheduledCarouselEntry {
  /** Identifiant interne unique (sert à l'idempotence). */
  id: string
  /** Date de mise en ligne, UTC, YYYY-MM-DD. */
  date: string
  /** Compte social GHL cible (1 seul par entrée : Insta, FB ou LinkedIn). */
  accountId: string
  /** Légende du post. */
  summary: string
  /** URLs publiques des slides, dans l'ordre. */
  media: string[]
}

export const SCHEDULED_CAROUSELS: ScheduledCarouselEntry[] = [
  {
    "id": "p1-instagram",
    "date": "2026-06-17",
    "accountId": "69eff3ee5e7fe87daffe93ca_15W1kS8V6KqgTPhtzaPZ_17841450347721638",
    "summary": "L'IA, c'est quoi en vrai ? 🤔\n\nPas de la magie : juste un programme qui répond au téléphone, au chat de ton site et sur WhatsApp quand tu as les mains prises. 24h/24, même le dimanche.\n\nGlisse pour comprendre 👉 et si tu veux l'entendre répondre, réserve 15 min (lien en bio).\n\n#Guadeloupe #Gwada #TPE971 #Artisan #Commerce #IA #AssistantIA #971",
    "media": [
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p1-ig/p1-ig-01.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p1-ig/p1-ig-02.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p1-ig/p1-ig-03.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p1-ig/p1-ig-04.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p1-ig/p1-ig-05.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p1-ig/p1-ig-06.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p1-ig/p1-ig-07.png"
    ]
  },
  {
    "id": "p1-facebook",
    "date": "2026-06-17",
    "accountId": "69eff38b1cb49d39b605e633_15W1kS8V6KqgTPhtzaPZ_104041555416160_page",
    "summary": "L'IA, c'est quoi en vrai ? 🤔\n\nPas de la magie : juste un programme qui répond au téléphone, au chat de ton site et sur WhatsApp quand tu as les mains prises. 24h/24, même le dimanche.\n\nGlisse pour comprendre 👉 et si tu veux l'entendre répondre, réserve 15 min (lien en bio).\n\n#Guadeloupe #Gwada #TPE971 #Artisan #Commerce #IA #AssistantIA #971",
    "media": [
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p1-ig/p1-ig-01.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p1-ig/p1-ig-02.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p1-ig/p1-ig-03.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p1-ig/p1-ig-04.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p1-ig/p1-ig-05.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p1-ig/p1-ig-06.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p1-ig/p1-ig-07.png"
    ]
  },
  {
    "id": "p1-linkedin",
    "date": "2026-06-17",
    "accountId": "69eff525a0fa2223c19c2cf7_15W1kS8V6KqgTPhtzaPZ_74095125_page",
    "summary": "« L'IA, c'est quoi, en vrai ? » — sans le jargon, pour les dirigeants de TPE.\n\nPas de la science-fiction : un assistant qui répond à vos appels, au chat de votre site et à vos messages WhatsApp quand vous avez les mains prises. 24h/24.\n\nVous voulez l'entendre répondre ? Réservez 15 minutes — lien en commentaire.\n\n#IA #Guadeloupe #TPE",
    "media": [
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p1-li/p1-li-01.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p1-li/p1-li-02.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p1-li/p1-li-03.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p1-li/p1-li-04.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p1-li/p1-li-05.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p1-li/p1-li-06.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p1-li/p1-li-07.png"
    ]
  },
  {
    "id": "p4-instagram",
    "date": "2026-06-20",
    "accountId": "69eff3ee5e7fe87daffe93ca_15W1kS8V6KqgTPhtzaPZ_17841450347721638",
    "summary": "Cet appel manqué t'a peut-être coûté un client. 📞\n\nTu es sur un chantier, en caisse, en soin… tu ne peux pas décrocher. Lui n'attend pas : 6 personnes sur 10 ne laissent même pas de message, elles appellent le voisin.\n\nUne voix qui répond toujours, au tél et sur WhatsApp 24h/24. Glisse 👉 et réserve 15 min (lien en bio).\n\n#Guadeloupe #Gwada #TPE971 #Artisan #Commerce #AssistantIA #971",
    "media": [
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p4-ig/p4-ig-01.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p4-ig/p4-ig-02.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p4-ig/p4-ig-03.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p4-ig/p4-ig-04.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p4-ig/p4-ig-05.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p4-ig/p4-ig-06.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p4-ig/p4-ig-07.png"
    ]
  },
  {
    "id": "p4-facebook",
    "date": "2026-06-20",
    "accountId": "69eff38b1cb49d39b605e633_15W1kS8V6KqgTPhtzaPZ_104041555416160_page",
    "summary": "Cet appel manqué t'a peut-être coûté un client. 📞\n\nTu es sur un chantier, en caisse, en soin… tu ne peux pas décrocher. Lui n'attend pas : 6 personnes sur 10 ne laissent même pas de message, elles appellent le voisin.\n\nUne voix qui répond toujours, au tél et sur WhatsApp 24h/24. Glisse 👉 et réserve 15 min (lien en bio).\n\n#Guadeloupe #Gwada #TPE971 #Artisan #Commerce #AssistantIA #971",
    "media": [
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p4-ig/p4-ig-01.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p4-ig/p4-ig-02.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p4-ig/p4-ig-03.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p4-ig/p4-ig-04.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p4-ig/p4-ig-05.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p4-ig/p4-ig-06.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p4-ig/p4-ig-07.png"
    ]
  },
  {
    "id": "p4-linkedin",
    "date": "2026-06-20",
    "accountId": "69eff525a0fa2223c19c2cf7_15W1kS8V6KqgTPhtzaPZ_74095125_page",
    "summary": "L'appel manqué qui vous coûte un client.\n\nVous êtes en intervention, en consultation, en caisse : impossible de décrocher. Mais le client n'attend pas — 6 personnes sur 10 ne laissent aucun message et appellent le concurrent.\n\nCe n'est pas un appel perdu, c'est un client perdu. Une voix qui répond toujours, au téléphone et sur WhatsApp, change la donne.\n\nRéservez 15 minutes — lien en commentaire.\n\n#Guadeloupe #TPE #IA",
    "media": [
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p4-li/p4-li-01.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p4-li/p4-li-02.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p4-li/p4-li-03.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p4-li/p4-li-04.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p4-li/p4-li-05.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p4-li/p4-li-06.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p4-li/p4-li-07.png"
    ]
  },
  {
    "id": "p7-instagram",
    "date": "2026-06-23",
    "accountId": "69eff3ee5e7fe87daffe93ca_15W1kS8V6KqgTPhtzaPZ_17841450347721638",
    "summary": "L'IA te fait peur ? On démêle. 🧠\n\n« Ça va me remplacer ? » Non — ton métier et tes mains, personne n'y touche. « C'est compliqué ? » Rien à installer. « C'est cher ? » Bien moins qu'une secrétaire.\n\nGlisse pour les 3 vérités 👉 et teste-la toi-même : réserve 15 min (lien en bio).\n\n#Guadeloupe #Gwada #TPE971 #IA #AssistantIA #Artisan #971",
    "media": [
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p7-ig/p7-ig-01.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p7-ig/p7-ig-02.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p7-ig/p7-ig-03.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p7-ig/p7-ig-04.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p7-ig/p7-ig-05.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p7-ig/p7-ig-06.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p7-ig/p7-ig-07.png"
    ]
  },
  {
    "id": "p7-facebook",
    "date": "2026-06-23",
    "accountId": "69eff38b1cb49d39b605e633_15W1kS8V6KqgTPhtzaPZ_104041555416160_page",
    "summary": "L'IA te fait peur ? On démêle. 🧠\n\n« Ça va me remplacer ? » Non — ton métier et tes mains, personne n'y touche. « C'est compliqué ? » Rien à installer. « C'est cher ? » Bien moins qu'une secrétaire.\n\nGlisse pour les 3 vérités 👉 et teste-la toi-même : réserve 15 min (lien en bio).\n\n#Guadeloupe #Gwada #TPE971 #IA #AssistantIA #Artisan #971",
    "media": [
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p7-ig/p7-ig-01.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p7-ig/p7-ig-02.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p7-ig/p7-ig-03.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p7-ig/p7-ig-04.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p7-ig/p7-ig-05.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p7-ig/p7-ig-06.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p7-ig/p7-ig-07.png"
    ]
  },
  {
    "id": "p7-linkedin",
    "date": "2026-06-23",
    "accountId": "69eff525a0fa2223c19c2cf7_15W1kS8V6KqgTPhtzaPZ_74095125_page",
    "summary": "IA : 3 idées reçues, 3 vérités — pour les dirigeants qui hésitent encore.\n\n« Ça va me remplacer ? » Non, votre savoir-faire reste le vôtre. « C'est compliqué ? » Rien à installer. « C'est cher ? » Bien moins qu'une secrétaire.\n\nCe que l'IA remplace, c'est le téléphone qui sonne dans le vide. Testez-la : réservez 15 minutes — lien en commentaire.\n\n#IA #Guadeloupe #TPE",
    "media": [
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p7-li/p7-li-01.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p7-li/p7-li-02.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p7-li/p7-li-03.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p7-li/p7-li-04.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p7-li/p7-li-05.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p7-li/p7-li-06.png",
      "https://wytvwfgamfaoqmvoqzps.supabase.co/storage/v1/object/public/sparkexecute-visuals/2026-06/edu-carrousels/p7-li/p7-li-07.png"
    ]
  }
]
