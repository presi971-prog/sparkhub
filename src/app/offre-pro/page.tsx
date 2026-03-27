'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, useInView, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import {
  PhoneOff, Eye, Clock, ArrowRight, Check, ChevronDown, ChevronUp,
  MessageCircle, Users, TrendingUp, Zap, Crown, Gift, Phone, Sparkles,
  Star, Shield, Headphones
} from 'lucide-react'

/* ─────────────────────────────────────────────
   STYLES — Inline pour isoler du design system
   ───────────────────────────────────────────── */
const COLORS = {
  bg: '#0a0a0f',
  surface: '#12121a',
  surfaceLight: '#1a1a2e',
  accent: '#f97316',    // orange vif
  accentGlow: '#fb923c',
  cyan: '#22d3ee',
  cyanDark: '#0891b2',
  text: '#f0f0f5',
  textMuted: '#8888a0',
  border: '#ffffff10',
  success: '#22c55e',
}

/* ─────────────────────────────────────────────
   ANIMATIONS
   ───────────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.7, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] as const }
  }),
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (i: number) => ({
    opacity: 1, scale: 1,
    transition: { duration: 0.5, delay: i * 0.12, ease: [0.25, 0.46, 0.45, 0.94] as const }
  }),
}

function Section({ children, className = '', id, style }: { children: React.ReactNode; className?: string; id?: string; style?: React.CSSProperties }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <section ref={ref} id={id} className={className} style={style}>
      {isInView ? children : <div style={{ minHeight: 200 }} />}
    </section>
  )
}

/* ─────────────────────────────────────────────
   FAQ
   ───────────────────────────────────────────── */
const faqs = [
  { q: "C'est vraiment gratuit ?", a: "Oui. Inscription Cobeone = 0€. Tu ne payes une commission que quand tu fais une vente via l'app. Et les 5 premiers de ta catégorie : 0% le premier mois." },
  { q: "Je ne suis pas à l'aise avec la tech.", a: "On s'occupe de tout. L'installation est faite par notre équipe. SparkHub crée un post en 30 secondes. Et Cobi t'aide sur WhatsApp." },
  { q: "L'IA au téléphone, c'est crédible ?", a: "Elle est personnalisée avec TES services, TES tarifs. La majorité des appelants ne font pas la différence. Et mieux vaut une IA qui répond qu'un téléphone qui sonne dans le vide." },
  { q: "Je peux tester avant ?", a: "Cobeone est gratuit. Pour DCG AI, demande une démo personnalisée à Cobi — c'est gratuit aussi." },
]

function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false)
  return (
    <motion.button
      custom={index}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      onClick={() => setOpen(!open)}
      className="w-full text-left rounded-2xl p-5 transition-all duration-300"
      style={{
        background: open ? COLORS.surfaceLight : COLORS.surface,
        border: `1px solid ${open ? COLORS.accent + '40' : COLORS.border}`,
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <span className="font-semibold" style={{ color: COLORS.text, fontSize: 15 }}>{q}</span>
        {open
          ? <ChevronUp size={18} style={{ color: COLORS.accent }} />
          : <ChevronDown size={18} style={{ color: COLORS.textMuted }} />
        }
      </div>
      <AnimatePresence>
        {open && (
          <motion.p
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ color: COLORS.textMuted, fontSize: 14, lineHeight: 1.6, marginTop: 12, overflow: 'hidden' }}
          >
            {a}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

/* ─────────────────────────────────────────────
   PAGE
   ───────────────────────────────────────────── */
export default function OffreProPage() {
  const [showSticky, setShowSticky] = useState(false)
  const ctaRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll()
  const progressWidth = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      const ctaTop = ctaRef.current?.offsetTop || Infinity
      const wh = window.innerHeight
      setShowSticky(scrollY > wh * 0.4 && scrollY + wh < ctaTop + 100)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div style={{ background: COLORS.bg, color: COLORS.text, minHeight: '100vh', fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>

      {/* Progress bar */}
      <motion.div
        style={{ width: progressWidth, height: 3, background: `linear-gradient(90deg, ${COLORS.cyan}, ${COLORS.accent})`, position: 'fixed', top: 0, left: 0, zIndex: 100 }}
      />

      {/* ═══════════════════════════════════════════
          HERO
          ═══════════════════════════════════════════ */}
      <section className="relative overflow-hidden" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center' }}>
        {/* Glow effects */}
        <div style={{
          position: 'absolute', top: '-20%', right: '-10%', width: 500, height: 500,
          background: `radial-gradient(circle, ${COLORS.accent}15 0%, transparent 70%)`,
          borderRadius: '50%', filter: 'blur(80px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-10%', left: '-10%', width: 400, height: 400,
          background: `radial-gradient(circle, ${COLORS.cyan}10 0%, transparent 70%)`,
          borderRadius: '50%', filter: 'blur(60px)',
        }} />

        <div className="relative z-10 w-full px-5 py-16 md:py-0" style={{ maxWidth: 800, margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', borderRadius: 100, fontSize: 13, fontWeight: 600,
              background: `${COLORS.accent}15`, color: COLORS.accent, border: `1px solid ${COLORS.accent}30`,
              marginBottom: 24,
            }}
          >
            <Sparkles size={14} /> Offre de lancement Guadeloupe
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            style={{
              fontFamily: 'var(--font-outfit), system-ui, sans-serif',
              fontSize: 'clamp(2rem, 7vw, 3.5rem)',
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
            }}
          >
            Ton téléphone sonne.{' '}
            <span style={{ background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.cyan})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Personne ne répond.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            style={{ marginTop: 20, fontSize: 17, lineHeight: 1.7, color: COLORS.textMuted, maxWidth: 600 }}
          >
            Chaque appel manqué, c'est un client qui part chez ton concurrent.
            Cobeone te donne une IA qui répond 24h/24, des outils marketing, et des clients — le tout sans pub Facebook.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            style={{ marginTop: 32, display: 'flex', flexWrap: 'wrap', gap: 12 }}
          >
            <Link
              href="/inscription/professionnel"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '14px 28px', borderRadius: 12, fontSize: 15, fontWeight: 700,
                background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentGlow})`,
                color: '#fff', textDecoration: 'none',
                boxShadow: `0 0 30px ${COLORS.accent}40`,
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 0 40px ${COLORS.accent}60` }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 0 30px ${COLORS.accent}40` }}
            >
              Rejoindre Cobeone <ArrowRight size={16} />
            </Link>
            <Link
              href="https://wa.me/33159580747"
              target="_blank"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '14px 28px', borderRadius: 12, fontSize: 15, fontWeight: 600,
                background: 'transparent', color: COLORS.text, textDecoration: 'none',
                border: `1px solid ${COLORS.border}`,
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = COLORS.cyan }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = COLORS.border }}
            >
              <MessageCircle size={16} /> Parler à Cobi
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            style={{ marginTop: 16, fontSize: 13, color: COLORS.textMuted }}
          >
            Gratuit. Sans engagement. Sans CB.
          </motion.p>
        </div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)' }}
        >
          <ChevronDown size={24} style={{ color: COLORS.textMuted }} />
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════
          LE PROBLÈME — 3 douleurs
          ═══════════════════════════════════════════ */}
      <Section className="px-5 py-20 md:py-28">
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <motion.p
            custom={0} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: COLORS.accent, marginBottom: 12 }}
          >
            Le problème
          </motion.p>
          <motion.h2
            custom={1} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            style={{ fontFamily: 'var(--font-outfit)', fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontWeight: 700, letterSpacing: '-0.02em' }}
          >
            Tu te reconnais ?
          </motion.h2>

          <div style={{ marginTop: 40, display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            {[
              { icon: PhoneOff, title: 'Appels manqués', text: 'Un touriste appelle à 22h. Tu dors. Il réserve chez ton concurrent.', color: COLORS.accent },
              { icon: Eye, title: 'Invisible en ligne', text: 'Pas de site, pas de fiche Google. Les gens cherchent — ils ne te trouvent pas.', color: COLORS.cyan },
              { icon: Clock, title: 'Zéro temps', text: 'Tu sais qu\'il faut poster sur Insta. Mais entre les clients et la compta...', color: COLORS.accentGlow },
            ].map((item, i) => (
              <motion.div
                key={i}
                custom={i + 2}
                variants={scaleIn}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                style={{
                  padding: 28, borderRadius: 20,
                  background: COLORS.surface,
                  border: `1px solid ${COLORS.border}`,
                  transition: 'border-color 0.3s, transform 0.3s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = item.color + '40'; e.currentTarget.style.transform = 'translateY(-4px)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: item.color + '15' }}>
                  <item.icon size={22} style={{ color: item.color }} />
                </div>
                <h3 style={{ marginTop: 16, fontSize: 17, fontWeight: 700, fontFamily: 'var(--font-outfit)' }}>{item.title}</h3>
                <p style={{ marginTop: 8, fontSize: 14, lineHeight: 1.6, color: COLORS.textMuted }}>{item.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════
          L'ÉCOSYSTÈME — 3 piliers visuels
          ═══════════════════════════════════════════ */}
      <Section className="px-5 py-20 md:py-28">
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <motion.p
            custom={0} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: COLORS.cyan, marginBottom: 12 }}
          >
            La solution
          </motion.p>
          <motion.h2
            custom={1} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            style={{ fontFamily: 'var(--font-outfit)', fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontWeight: 700, letterSpacing: '-0.02em' }}
          >
            3 outils. <span style={{ color: COLORS.accent }}>0 prise de tête.</span>
          </motion.h2>

          <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Cobeone */}
            <motion.div custom={2} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
              style={{ padding: 28, borderRadius: 20, background: `linear-gradient(135deg, ${COLORS.success}08, ${COLORS.surface})`, border: `1px solid ${COLORS.success}25` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-outfit)' }}>Cobeone</h3>
                <span style={{ padding: '4px 12px', borderRadius: 100, fontSize: 12, fontWeight: 700, background: COLORS.success, color: '#fff' }}>GRATUIT</span>
              </div>
              <p style={{ marginTop: 12, fontSize: 15, fontWeight: 600, color: COLORS.text }}>Tes clients te trouvent.</p>
              <p style={{ marginTop: 8, fontSize: 14, lineHeight: 1.6, color: COLORS.textMuted }}>
                Ton profil pro sur la super-app de Guadeloupe. Les habitants et touristes te découvrent, te contactent et te paient. Commission 15% dégressive — <strong style={{ color: COLORS.accent }}>0% le premier mois pour les 5 premiers</strong>.
              </p>
            </motion.div>

            {/* SparkHub */}
            <motion.div custom={3} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
              style={{ padding: 28, borderRadius: 20, background: `linear-gradient(135deg, ${COLORS.cyan}08, ${COLORS.surface})`, border: `1px solid ${COLORS.cyan}25` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-outfit)' }}>SparkHub</h3>
                <span style={{ padding: '4px 12px', borderRadius: 100, fontSize: 12, fontWeight: 700, background: COLORS.cyan, color: '#000' }}>OFFERT avec DCG AI</span>
              </div>
              <p style={{ marginTop: 12, fontSize: 15, fontWeight: 600, color: COLORS.text }}>Ton marketing en pilote auto.</p>
              <p style={{ marginTop: 8, fontSize: 14, lineHeight: 1.6, color: COLORS.textMuted }}>
                Posts réseaux sociaux, mini-site, studio photo IA, menu digital, logo, vidéos. Ce qu'une agence facture 500€/mois — en quelques clics.
              </p>
            </motion.div>

            {/* DCG AI */}
            <motion.div custom={4} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
              style={{ padding: 28, borderRadius: 20, background: `linear-gradient(135deg, ${COLORS.accent}10, ${COLORS.surface})`, border: `1px solid ${COLORS.accent}30`, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, background: `radial-gradient(circle, ${COLORS.accent}15 0%, transparent 70%)`, borderRadius: '50%' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', position: 'relative' }}>
                <h3 style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-outfit)' }}>DCG AI</h3>
                <span style={{ padding: '4px 12px', borderRadius: 100, fontSize: 12, fontWeight: 700, background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentGlow})`, color: '#fff' }}>GAME-CHANGER</span>
              </div>
              <p style={{ marginTop: 12, fontSize: 15, fontWeight: 600, color: COLORS.text, position: 'relative' }}>Une IA qui décroche à ta place. 24h/24.</p>
              <p style={{ marginTop: 8, fontSize: 14, lineHeight: 1.6, color: COLORS.textMuted, position: 'relative' }}>
                Agent vocal personnalisé : tes services, tes tarifs, ton style. Répond au téléphone, prend les RDV, collecte les avis Google. Même à 3h du matin.
              </p>
              <a href="#tarifs" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16, fontSize: 14, fontWeight: 600, color: COLORS.accent, textDecoration: 'none', position: 'relative' }}>
                Voir les tarifs <ArrowRight size={14} />
              </a>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════
          SCÉNARIOS — Storytelling
          ═══════════════════════════════════════════ */}
      <Section className="px-5 py-20 md:py-28" style={{ background: COLORS.surface }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <motion.p
            custom={0} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: COLORS.accentGlow, marginBottom: 12 }}
          >
            Imagine
          </motion.p>
          <motion.h2
            custom={1} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            style={{ fontFamily: 'var(--font-outfit)', fontSize: 'clamp(1.5rem, 5vw, 2.2rem)', fontWeight: 700, letterSpacing: '-0.02em' }}
          >
            Dès la semaine prochaine...
          </motion.h2>

          <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 28 }}>
            {[
              { emoji: '🍽️', name: 'Marie, restauratrice', loc: 'Sainte-Anne', story: 'Il est 21h. Son IA répond à un couple de Montréal. Réservation confirmée. Avis 5 étoiles le lendemain.' },
              { emoji: '🔧', name: 'Kévin, plombier', loc: 'Les Abymes', story: 'Sous un évier, les mains pleines. 3 appels en 20 min. L\'IA répond, note le problème, rappelle le client.' },
              { emoji: '💇', name: 'Vanessa, coiffeuse', loc: 'Pointe-à-Pitre', story: 'Jamais posté sur Insta. Avec SparkHub, visuels en 30 sec. 4 nouvelles clientes/mois. 0€ de pub.' },
            ].map((s, i) => (
              <motion.div key={i} custom={i + 2} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
                style={{ display: 'flex', gap: 16 }}>
                <span style={{ fontSize: 32, lineHeight: 1 }}>{s.emoji}</span>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700 }}>{s.name} <span style={{ color: COLORS.textMuted, fontWeight: 400 }}>— {s.loc}</span></p>
                  <p style={{ marginTop: 6, fontSize: 14, lineHeight: 1.6, color: COLORS.textMuted }}>{s.story}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════
          TARIFS DCG AI
          ═══════════════════════════════════════════ */}
      <Section id="tarifs" className="px-5 py-20 md:py-28">
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <motion.div custom={0} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: COLORS.accent, marginBottom: 12 }}>Tarifs</p>
            <h2 style={{ fontFamily: 'var(--font-outfit)', fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontWeight: 700, letterSpacing: '-0.02em' }}>
              Ne perds plus <span style={{ color: COLORS.accent }}>un seul appel.</span>
            </h2>
            <p style={{ marginTop: 12, fontSize: 15, color: COLORS.textMuted }}>Moins qu'un employé à mi-temps. Plus fiable qu'un répondeur.</p>
          </motion.div>

          <div style={{ marginTop: 40, display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            {[
              { name: 'Starter', old: 397, price: 197, pop: false, features: ['Téléphone IA personnalisé', 'Collecte d\'avis Google', 'Rapport d\'appels'] },
              { name: 'Business', old: 597, price: 347, pop: true, features: ['Tout Starter +', 'WhatsApp, Insta, Messenger', 'CRM intégré', 'Employé virtuel'] },
              { name: 'Premium', old: 797, price: 497, pop: false, features: ['Tout Business +', 'RDV automatique', 'Relances intelligentes', 'Analyse IA'] },
            ].map((plan, i) => (
              <motion.div key={i} custom={i + 1} variants={scaleIn} initial="hidden" whileInView="visible" viewport={{ once: true }}
                style={{
                  padding: 28, borderRadius: 20, position: 'relative',
                  background: plan.pop ? `linear-gradient(160deg, ${COLORS.accent}12, ${COLORS.surface})` : COLORS.surface,
                  border: `${plan.pop ? 2 : 1}px solid ${plan.pop ? COLORS.accent + '50' : COLORS.border}`,
                  boxShadow: plan.pop ? `0 0 40px ${COLORS.accent}15` : 'none',
                }}>
                {plan.pop && (
                  <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', padding: '4px 16px', borderRadius: 100, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, background: COLORS.accent, color: '#fff' }}>
                    Populaire
                  </div>
                )}
                <h3 style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-outfit)' }}>{plan.name}</h3>
                <div style={{ marginTop: 12 }}>
                  <span style={{ fontSize: 14, color: COLORS.textMuted, textDecoration: 'line-through' }}>{plan.old}€/mois</span>
                  <div style={{ fontSize: 40, fontWeight: 800, fontFamily: 'var(--font-outfit)', letterSpacing: '-0.03em' }}>
                    {plan.price}€<span style={{ fontSize: 16, fontWeight: 400, color: COLORS.textMuted }}>/mois</span>
                  </div>
                </div>
                <ul style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {plan.features.map((f, j) => (
                    <li key={j} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: COLORS.textMuted }}>
                      <Check size={15} style={{ color: COLORS.cyan, flexShrink: 0 }} /> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="https://api.digital-code-growth.com/widget/booking/LRaECnfnDuuZ7d22mo7"
                  target="_blank"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    marginTop: 24, padding: '12px 0', borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none',
                    background: plan.pop ? `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentGlow})` : 'transparent',
                    color: plan.pop ? '#fff' : COLORS.text,
                    border: plan.pop ? 'none' : `1px solid ${COLORS.border}`,
                    boxShadow: plan.pop ? `0 0 20px ${COLORS.accent}30` : 'none',
                  }}
                >
                  Choisir {plan.name} <ArrowRight size={14} />
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Bonus */}
          <motion.div custom={5} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            style={{
              marginTop: 24, padding: 24, borderRadius: 20, display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            }}>
            <div style={{ padding: 20, borderRadius: 16, background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Zap size={18} style={{ color: COLORS.cyan }} />
                <span style={{ fontWeight: 700, fontSize: 15 }}>Installation</span>
              </div>
              <p style={{ fontSize: 14, color: COLORS.textMuted }}>
                <span style={{ textDecoration: 'line-through' }}>997€</span> → <strong style={{ color: COLORS.text, fontSize: 20 }}>297€</strong> — On configure tout.
              </p>
            </div>
            <div style={{ padding: 20, borderRadius: 16, background: `${COLORS.accent}08`, border: `1px solid ${COLORS.accent}20` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Gift size={18} style={{ color: COLORS.accent }} />
                <span style={{ fontWeight: 700, fontSize: 15 }}>Bonus DCG AI</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: COLORS.textMuted }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Check size={13} style={{ color: COLORS.accent }} /> SparkHub offert (9,90€/mois)</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Check size={13} style={{ color: COLORS.accent }} /> Commission Cobeone → 5%</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Check size={13} style={{ color: COLORS.accent }} /> Support prioritaire</span>
              </div>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════
          PARRAINAGE
          ═══════════════════════════════════════════ */}
      <Section className="px-5 py-20 md:py-28" style={{ background: COLORS.surface }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <motion.div custom={0} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: COLORS.success, marginBottom: 12 }}>Parrainage</p>
            <h2 style={{ fontFamily: 'var(--font-outfit)', fontSize: 'clamp(1.5rem, 5vw, 2.2rem)', fontWeight: 700, letterSpacing: '-0.02em' }}>
              Gagne de l'argent <span style={{ color: COLORS.success }}>en parlant de Cobeone.</span>
            </h2>
          </motion.div>

          <motion.div custom={1} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
            {[
              { label: 'Niveau 1', pct: '10%' },
              { label: 'Niveau 2', pct: '8%' },
              { label: 'Niveau 3', pct: '6%' },
              { label: 'Niveau 4', pct: '4%' },
            ].map((l, i) => (
              <div key={i} style={{ padding: '16px 8px', borderRadius: 16, background: `${COLORS.success}10`, border: `1px solid ${COLORS.success}20` }}>
                <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-outfit)', color: COLORS.success }}>{l.pct}</div>
                <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}>{l.label}</div>
              </div>
            ))}
          </motion.div>

          <motion.p custom={2} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            style={{ marginTop: 24, textAlign: 'center', fontSize: 14, color: COLORS.textMuted, lineHeight: 1.6 }}>
            Tu partages ton lien. Quand tes filleuls achètent sur l'app — même chez un autre pro — tu touches.{' '}
            <strong style={{ color: COLORS.text }}>En Guadeloupe, tout le monde connaît tout le monde. Ici, ça paye.</strong>
          </motion.p>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════
          FAQ
          ═══════════════════════════════════════════ */}
      <Section className="px-5 py-20 md:py-28">
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <motion.h2
            custom={0} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            style={{ fontFamily: 'var(--font-outfit)', fontSize: 'clamp(1.3rem, 4vw, 2rem)', fontWeight: 700, textAlign: 'center', marginBottom: 32 }}
          >
            Questions fréquentes
          </motion.h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {faqs.map((faq, i) => <FaqItem key={i} q={faq.q} a={faq.a} index={i + 1} />)}
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════
          CTA FINAL
          ═══════════════════════════════════════════ */}
      <section ref={ctaRef} className="px-5 py-20 md:py-28" style={{
        background: `linear-gradient(160deg, ${COLORS.accent}, #c2410c)`,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.08) 0%, transparent 60%)' }} />
        <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <Crown size={36} style={{ color: 'rgba(255,255,255,0.7)', margin: '0 auto 16px' }} />
          <h2 style={{ fontFamily: 'var(--font-outfit)', fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            Les 5 premières places partent vite.
          </h2>
          <p style={{ marginTop: 16, fontSize: 15, color: 'rgba(255,255,255,0.85)', lineHeight: 1.7 }}>
            0% de commission le premier mois. Installation DCG AI à 297€ au lieu de 997€. Ces tarifs ne dureront pas.
          </p>

          <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <Link
              href="/inscription/professionnel"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '16px 32px', borderRadius: 14, fontSize: 16, fontWeight: 800,
                background: '#fff', color: COLORS.accent, textDecoration: 'none',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.03)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              <Sparkles size={16} /> Je rejoins Cobeone
            </Link>
            <Link
              href="https://wa.me/33159580747"
              target="_blank"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.9)', textDecoration: 'none' }}
            >
              <MessageCircle size={14} /> Ou parle à Cobi sur WhatsApp
            </Link>
          </div>

          <p style={{ marginTop: 20, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
            Inscription en 2 minutes. Profil en ligne aujourd'hui. Premiers clients cette semaine.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          FOOTER STICKY MOBILE
          ═══════════════════════════════════════════ */}
      <AnimatePresence>
        {showSticky && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
              padding: 12, background: `${COLORS.bg}ee`, backdropFilter: 'blur(12px)',
              borderTop: `1px solid ${COLORS.border}`,
            }}
            className="md:hidden"
          >
            <Link
              href="/inscription/professionnel"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '14px 0', borderRadius: 12, fontSize: 15, fontWeight: 700,
                background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentGlow})`,
                color: '#fff', textDecoration: 'none',
                boxShadow: `0 0 20px ${COLORS.accent}40`,
              }}
            >
              Rejoindre Cobeone — Gratuit <ArrowRight size={15} />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
