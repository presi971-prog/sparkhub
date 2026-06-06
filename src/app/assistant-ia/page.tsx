'use client'

// Page de vente DCG AI — assistante IA pour artisans en Guadeloupe.
// Mobile-first, fond clair dominant, hero en gradient violet.
// framer-motion pour les entrées au scroll + sticky CTA mobile.

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PhoneOff,
  Clock,
  CalendarX,
  PhoneCall,
  MessagesSquare,
  CalendarCheck,
  Headphones,
  Check,
  ChevronDown,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

// Liens / actions (source de vérité unique pour tous les CTA de la page)
const BOOKING_URL =
  'https://api.digital-code-growth.com/widget/booking/LRaECnfnDuuZ7d22mo7'
const TEL_HREF = 'tel:+33939243915'
const TEL_LABEL = '09 39 24 39 15'

// Variantes d'animation réutilisables (entrée discrète au scroll)
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
}

// Petit wrapper pour animer une section au scroll sans répéter les props
function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      className={className}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, ease: 'easeOut', delay }}
    >
      {children}
    </motion.div>
  )
}

// Bouton CTA primaire (violet plein) — vrai <a> pour l'accessibilité
function PrimaryCTA({ className = '' }: { className?: string }) {
  return (
    <a
      href={BOOKING_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-[52px] items-center justify-center rounded-full bg-gradient-to-r from-[#AB30E4] to-[#DE7CFA] px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-[#AB30E4]/30 transition-transform duration-200 hover:scale-[1.03] active:scale-100 ${className}`}
    >
      Réserver ma démo gratuite
    </a>
  )
}

// Bouton CTA secondaire (outline) — déclenche un appel au tap
function SecondaryCTA({
  className = '',
  dark = false,
}: {
  className?: string
  dark?: boolean
}) {
  return (
    <a
      href={TEL_HREF}
      className={`inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border-2 px-6 py-3.5 text-base font-semibold transition-transform duration-200 hover:scale-[1.03] active:scale-100 ${
        dark
          ? 'border-white/70 text-white hover:bg-white/10'
          : 'border-[#AB30E4] text-[#AB30E4] hover:bg-[#AB30E4]/5'
      } ${className}`}
    >
      <Headphones className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span>Écoute-la répondre : {TEL_LABEL}</span>
    </a>
  )
}

// Données FAQ
const faqItems = [
  {
    q: 'Est-ce que ça marche vraiment ?',
    a: 'Appelle le numéro de démo, tu jugeras toi-même. C\'est l\'IA qui décroche.',
  },
  {
    q: 'Je vais perdre le contact humain avec mes clients ?',
    a: 'Au contraire. Aujourd\'hui un client sur deux tombe sur ton répondeur. Là, il a toujours quelqu\'un d\'aimable qui répond, et qui te passe le relais quand c\'est sérieux.',
  },
  {
    q: 'C\'est compliqué à installer ?',
    a: 'Non. On configure tout pour toi. Tu n\'as rien à faire.',
  },
  {
    q: 'Et si je veux arrêter ?',
    a: 'Sans engagement. Tu arrêtes quand tu veux. Garantie 30 jours.',
  },
  {
    q: 'Pourquoi WhatsApp et pas SMS ?',
    a: 'En Guadeloupe, les SMS depuis un numéro français sont bloqués par les opérateurs. WhatsApp, tout le monde l\'utilise déjà ici.',
  },
  {
    q: 'Mes clients vont sentir que c\'est un robot ?',
    a: `Elle parle naturellement, en français simple. Et tu peux l'écouter avant de te décider : ${TEL_LABEL}.`,
  },
]

export default function AssistantIaPage() {
  // Index de la question FAQ ouverte (accordéon)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  return (
    <div className="min-h-screen bg-[#FBF7FE] font-body text-[#1C1023]">
      {/* ============================ 1. BARRE DU HAUT ============================ */}
      <header className="sticky top-0 z-40 border-b border-[#AB30E4]/10 bg-gradient-to-r from-[#3B0A52] to-[#5B1180] backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Image
            src="/dcg-ai/logo-dcg-white.png"
            alt="DCG AI"
            width={40}
            height={40}
            className="h-9 w-9 object-contain"
            priority
          />
          <a
            href={TEL_HREF}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
          >
            <Headphones className="h-4 w-4" aria-hidden="true" />
            Écouter l&apos;IA
          </a>
        </div>
      </header>

      {/* ============================ 2. HERO ============================ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#3B0A52] via-[#5B1180] to-[#7A1AA8] text-white">
        {/* Halo décoratif doux en fond */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-[-10%] h-72 w-72 rounded-full bg-[#DE7CFA]/30 blur-3xl"
        />
        <div className="relative mx-auto max-w-5xl px-4 pb-12 pt-10 md:grid md:grid-cols-2 md:items-center md:gap-10 md:pb-16 md:pt-14">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="font-heading text-[1.85rem] font-bold leading-tight sm:text-4xl md:text-[2.6rem]"
            >
              Ton téléphone sonne. Tu es sur un chantier.{' '}
              <span className="bg-gradient-to-r from-[#DE7CFA] to-[#F5C6FF] bg-clip-text text-transparent">
                Cette fois, quelqu&apos;un répond.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
              className="mt-5 text-[1.05rem] leading-relaxed text-white/90 sm:text-lg"
            >
              Ton assistante IA décroche, répond sur WhatsApp, et pose tes
              rendez-vous toute seule. 24h/24. Une secrétaire coûte 2 200 € par
              mois. Elle, c&apos;est 197 €. Et elle ne dort jamais.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
              className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap"
            >
              <PrimaryCTA />
              <SecondaryCTA dark />
            </motion.div>

            <p className="mt-4 text-sm text-white/70">
              Gratuit · 15 min · Sans engagement
            </p>
          </div>

          {/* Photo héro — arrondie, ombre douce */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 }}
            className="relative mx-auto mt-10 w-full max-w-sm md:mt-0"
          >
            <div className="overflow-hidden rounded-3xl border border-white/20 shadow-2xl shadow-black/40">
              <Image
                src="/dcg-ai/plombier-guadeloupe.png"
                alt="Un plombier en Guadeloupe consulte son assistante IA sur son téléphone, devant des volets créoles et des hibiscus"
                width={1080}
                height={1080}
                className="h-auto w-full object-cover"
                priority
                sizes="(max-width: 768px) 90vw, 400px"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================ 3. LE PROBLÈME ============================ */}
      <section className="mx-auto max-w-3xl px-4 py-14 md:py-20">
        <Reveal>
          <h2 className="text-center font-heading text-2xl font-bold sm:text-3xl">
            Tu connais ça ?
          </h2>
        </Reveal>

        <div className="mt-9 space-y-4">
          {[
            {
              icon: PhoneOff,
              text: 'Tu es sur un chantier, le téléphone sonne. Tu ne peux pas répondre.',
            },
            {
              icon: Clock,
              text: 'Le client pressé ne laisse pas de message. Il appelle le concurrent suivant.',
            },
            {
              icon: CalendarX,
              text: 'Le soir, tu rappelles tes appels manqués. Trop tard, le rendez-vous est pris ailleurs.',
            },
          ].map(({ icon: Icon, text }, i) => (
            <Reveal key={i} delay={i * 0.08}>
              <div className="flex items-start gap-4 rounded-2xl border border-[#AB30E4]/10 bg-white p-4 shadow-sm sm:p-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FBEAFE] text-[#AB30E4]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <p className="pt-1.5 text-base leading-relaxed text-[#3A2D44]">
                  {text}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <p className="mt-9 text-center text-lg font-semibold leading-relaxed text-[#1C1023] sm:text-xl">
            Le problème, ce n&apos;est pas ton travail. C&apos;est que tu ne peux
            être qu&apos;à un endroit à la fois.
          </p>
        </Reveal>
      </section>

      {/* ============================ 4. LA SOLUTION ============================ */}
      <section className="bg-white py-14 md:py-20">
        <div className="mx-auto max-w-4xl px-4">
          <Reveal>
            <h2 className="text-center font-heading text-2xl font-bold sm:text-3xl">
              Comment ça marche
            </h2>
          </Reveal>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              {
                icon: PhoneCall,
                title: 'Le client te contacte',
                text: 'Il t\'appelle ou t\'écrit sur WhatsApp, à toute heure.',
              },
              {
                icon: MessagesSquare,
                title: 'Ton assistante répond',
                text: 'Elle pose les bonnes questions, rassure et reste polie.',
              },
              {
                icon: CalendarCheck,
                title: 'Le rendez-vous est posé',
                text: 'Il tombe directement dans ton agenda. Tu n\'as rien à faire.',
              },
            ].map(({ icon: Icon, title, text }, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <div className="h-full rounded-2xl border border-[#AB30E4]/10 bg-[#FBF7FE] p-6 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#AB30E4] to-[#DE7CFA] text-white shadow-md shadow-[#AB30E4]/30">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <span className="mt-4 block text-sm font-bold text-[#AB30E4]">
                    Étape {i + 1}
                  </span>
                  <h3 className="mt-1 font-heading text-lg font-bold">{title}</h3>
                  <p className="mt-2 text-[0.95rem] leading-relaxed text-[#3A2D44]">
                    {text}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Encart différenciateur chat + vocal */}
          <Reveal delay={0.1}>
            <div className="mt-9 flex items-center gap-4 rounded-2xl bg-gradient-to-r from-[#3B0A52] to-[#7A1AA8] p-6 text-white">
              <Sparkles className="hidden h-8 w-8 shrink-0 text-[#DE7CFA] sm:block" aria-hidden="true" />
              <p className="text-base font-semibold leading-relaxed sm:text-lg">
                Au téléphone ET sur WhatsApp. Le client choisit. Toi, tu bosses
                tranquille.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================ 5. PREUVE — ÉTUDE DE CAS ============================ */}
      <section className="mx-auto max-w-3xl px-4 py-14 md:py-20">
        <Reveal>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FBEAFE] px-3 py-1 text-sm font-bold text-[#AB30E4]">
            Exemple concret
          </span>
          <h2 className="mt-4 font-heading text-2xl font-bold sm:text-3xl">
            Une semaine avec Marc, plombier à Baie-Mahault
          </h2>
        </Reveal>

        <Reveal delay={0.05}>
          <div className="mt-7 space-y-5 text-base leading-relaxed text-[#3A2D44]">
            <p>
              <strong className="text-[#1C1023]">Lundi, 7h40.</strong> Marc est
              déjà sur un chantier, les mains dans un tuyau. Un nouveau client lui
              écrit sur WhatsApp. Dix secondes plus tard, son assistante IA a
              répondu, posé les bonnes questions et bloqué un rendez-vous pour
              jeudi matin. Marc n&apos;a même pas sorti son téléphone.
            </p>
            <p>
              <strong className="text-[#1C1023]">Mardi, 21h.</strong> Un dégât des
              eaux. Le client panique et cherche un plombier sur internet.
              D&apos;habitude, à cette heure-là, ça tombe sur le répondeur. Cette
              fois, l&apos;assistante répond, rassure et note l&apos;intervention en
              urgence.
            </p>
            <p>
              <strong className="text-[#1C1023]">Le soir, en rentrant.</strong> Marc
              n&apos;a plus 8 appels manqués à rappeler. Il a 8 rendez-vous déjà
              posés dans son agenda. Il dîne tranquille.
            </p>
          </div>
        </Reveal>

        {/* Bloc de stats */}
        <Reveal delay={0.1}>
          <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { big: '197 €', small: 'par mois' },
              { big: '24h/24', small: 'jamais fermé' },
              { big: '11×', small: 'moins cher qu\'une secrétaire' },
              { big: '0', small: 'appel raté' },
            ].map((s, i) => (
              <div
                key={i}
                className="rounded-2xl border border-[#AB30E4]/10 bg-white p-4 text-center shadow-sm"
              >
                <div className="font-heading text-2xl font-bold text-[#AB30E4] sm:text-3xl">
                  {s.big}
                </div>
                <div className="mt-1 text-xs leading-snug text-[#78716C] sm:text-sm">
                  {s.small}
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Encart fort : appelle pour vérifier */}
        <Reveal delay={0.1}>
          <div className="mt-9 rounded-2xl border-2 border-dashed border-[#AB30E4]/40 bg-[#FBEAFE] p-6 text-center">
            <p className="text-lg font-bold text-[#1C1023]">
              Ne me crois pas sur parole.
            </p>
            <p className="mt-1 text-base text-[#3A2D44]">
              Appelle ce numéro, c&apos;est l&apos;IA qui décroche :
            </p>
            <SecondaryCTA className="mt-4" />
          </div>
        </Reveal>
      </section>

      {/* ============================ 6. CTA INTERMÉDIAIRE ============================ */}
      <section className="bg-gradient-to-r from-[#3B0A52] to-[#7A1AA8] py-14 text-white md:py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <Reveal>
            <h2 className="font-heading text-2xl font-bold sm:text-3xl">
              Arrête de courir après tes appels manqués.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/90 sm:text-lg">
              Laisse ton assistante IA répondre à ta place et remplir ton agenda
              pendant que tu travailles.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
              <PrimaryCTA />
              <SecondaryCTA dark />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================ 7. LE PRIX (ancrage) ============================ */}
      <section className="mx-auto max-w-4xl px-4 py-14 md:py-20">
        <Reveal>
          <h2 className="text-center font-heading text-2xl font-bold sm:text-3xl">
            Combien ça coûte ?
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-5 md:grid-cols-2 md:items-stretch">
          {/* Ancrage : une secrétaire (grisé, barré) */}
          <Reveal>
            <div className="flex h-full flex-col rounded-3xl border border-[#E7E5E4] bg-[#F5F5F4] p-7 opacity-90">
              <span className="text-sm font-semibold uppercase tracking-wide text-[#78716C]">
                Une secrétaire
              </span>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-heading text-4xl font-bold text-[#78716C] line-through decoration-[#A8A29E] decoration-2">
                  2 200 €
                </span>
                <span className="text-base text-[#78716C]">/mois</span>
              </div>
              <ul className="mt-5 space-y-2 text-[0.95rem] text-[#78716C]">
                <li>Présente seulement de 8h à 17h</li>
                <li>Absente le soir et le week-end</li>
                <li>Congés, maladie, charges sociales</li>
              </ul>
            </div>
          </Reveal>

          {/* Offre mise en avant */}
          <Reveal delay={0.08}>
            <div className="relative flex h-full flex-col rounded-3xl border-2 border-[#AB30E4] bg-white p-7 shadow-xl shadow-[#AB30E4]/15">
              <span className="absolute -top-3 left-7 rounded-full bg-gradient-to-r from-[#AB30E4] to-[#DE7CFA] px-3 py-1 text-xs font-bold text-white">
                Offre de lancement Guadeloupe
              </span>
              <span className="text-sm font-semibold uppercase tracking-wide text-[#AB30E4]">
                Ton assistante IA
              </span>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-heading text-5xl font-bold text-[#1C1023]">
                  197 €
                </span>
                <span className="text-base text-[#78716C]">/mois</span>
              </div>
              <p className="mt-1 text-sm text-[#78716C]">
                au lieu de{' '}
                <span className="line-through">397 €/mois</span> · installation{' '}
                <span className="font-semibold text-[#1C1023]">297 €</span> au lieu
                de <span className="line-through">997 €</span>
              </p>
              <ul className="mt-5 space-y-3 text-[0.95rem] text-[#3A2D44]">
                {[
                  'Disponible 24h/24, 7j/7, même la nuit',
                  'Répond au téléphone ET sur WhatsApp',
                  'Pose les rendez-vous dans ton agenda',
                  'On configure tout pour toi',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#AB30E4]" aria-hidden="true" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <PrimaryCTA className="mt-7 w-full" />
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <p className="mt-7 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-sm text-[#78716C]">
            <ShieldCheck className="h-4 w-4 text-[#AB30E4]" aria-hidden="true" />
            <span>Sans engagement</span>
            <span aria-hidden="true">·</span>
            <span>Garantie 30 jours</span>
            <span aria-hidden="true">·</span>
            <span>On configure tout pour toi</span>
          </p>
          <p className="mt-2 text-center text-xs text-[#A8A29E]">
            Offre de lancement à durée limitée, réservée à la Guadeloupe.
          </p>
        </Reveal>
      </section>

      {/* ============================ 8. FAQ / OBJECTIONS ============================ */}
      <section className="bg-white py-14 md:py-20">
        <div className="mx-auto max-w-2xl px-4">
          <Reveal>
            <h2 className="text-center font-heading text-2xl font-bold sm:text-3xl">
              Les questions qu&apos;on nous pose
            </h2>
          </Reveal>

          <div className="mt-9 space-y-3">
            {faqItems.map((item, i) => {
              const isOpen = openFaq === i
              return (
                <Reveal key={i} delay={i * 0.04}>
                  <div className="overflow-hidden rounded-2xl border border-[#AB30E4]/10 bg-[#FBF7FE]">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                      aria-expanded={isOpen}
                      className="flex min-h-[56px] w-full items-center justify-between gap-3 px-5 py-4 text-left"
                    >
                      <span className="font-heading text-base font-semibold text-[#1C1023]">
                        {item.q}
                      </span>
                      <ChevronDown
                        className={`h-5 w-5 shrink-0 text-[#AB30E4] transition-transform duration-300 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeOut' }}
                        >
                          <p className="px-5 pb-5 text-[0.95rem] leading-relaxed text-[#3A2D44]">
                            {item.a}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ============================ 9. CTA FINAL ============================ */}
      <section className="bg-gradient-to-b from-[#5B1180] to-[#3B0A52] py-16 text-white md:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <Reveal>
            <h2 className="font-heading text-2xl font-bold sm:text-3xl md:text-4xl">
              Ton prochain client va appeler aujourd&apos;hui.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/90 sm:text-lg">
              La seule question, c&apos;est : est-ce que quelqu&apos;un sera là pour
              répondre ? Réserve ta démo gratuite, on te montre tout en 15 minutes.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
              <PrimaryCTA />
              <SecondaryCTA dark />
            </div>
            <p className="mt-4 text-sm text-white/70">
              Gratuit · 15 min · Sans engagement
            </p>
          </Reveal>
        </div>
      </section>

      {/* ============================ 10. FOOTER ============================ */}
      <footer className="bg-[#2A0740] py-10 text-center text-white/70">
        <div className="mx-auto max-w-3xl px-4">
          <Image
            src="/dcg-ai/logo-dcg-white.png"
            alt="DCG AI"
            width={48}
            height={48}
            className="mx-auto h-11 w-11 object-contain"
          />
          <p className="mt-4 text-sm">
            DCG AI — Digital Code Growth · Guadeloupe
          </p>
          <p className="mt-1 text-xs text-white/50">© 2026 · Tous droits réservés</p>
          <a
            href="#"
            className="mt-3 inline-block text-xs text-white/50 underline-offset-2 hover:underline"
          >
            Mentions légales
          </a>
        </div>
      </footer>

      {/* ============================ STICKY CTA MOBILE ============================ */}
      {/* Barre fixe en bas, visible uniquement sur mobile (md:hidden), zone du pouce */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#AB30E4]/15 bg-white/95 px-4 py-3 shadow-[0_-4px_20px_rgba(171,48,228,0.12)] backdrop-blur md:hidden">
        <a
          href={BOOKING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-[52px] w-full items-center justify-center rounded-full bg-gradient-to-r from-[#AB30E4] to-[#DE7CFA] px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-[#AB30E4]/30 active:scale-[0.99]"
        >
          Réserver ma démo
        </a>
      </div>

      {/* Espace pour que le sticky CTA ne masque pas le footer sur mobile */}
      <div className="h-20 md:hidden" aria-hidden="true" />
    </div>
  )
}
