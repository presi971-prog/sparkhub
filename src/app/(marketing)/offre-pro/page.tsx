'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  PhoneOff, Search, Clock, Sparkles, ArrowRight, Check,
  Star, ChevronDown, ChevronUp, MessageCircle, Users,
  TrendingUp, Zap, Crown, Gift, Phone
} from 'lucide-react'

// ============================================
// Animation variants
// ============================================
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
}

const stagger = {
  visible: { transition: { staggerChildren: 0.15 } },
}

function AnimatedSection({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.section
      ref={ref}
      id={id}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.section>
  )
}

// ============================================
// FAQ Accordion
// ============================================
const faqs = [
  {
    q: "C'est vraiment gratuit l'inscription sur Cobeone ?",
    a: "Oui. Tu crées ton profil, tu es visible, tu reçois des clients. Tu ne payes que la commission quand tu fais une vente via l'app. Et si tu fais partie des 5 premiers de ta catégorie, c'est 0% le premier mois.",
  },
  {
    q: "Et si je ne suis pas à l'aise avec la technologie ?",
    a: "On s'occupe de tout. L'installation DCG AI est faite par notre équipe. SparkHub est conçu pour que tu crées un post en 30 secondes. Et Cobi est là sur WhatsApp pour t'aider à tout moment.",
  },
  {
    q: "L'IA au téléphone, ça fait pas bizarre pour mes clients ?",
    a: "L'IA est personnalisée avec tes informations, tes services et ton style. La majorité des appelants ne font pas la différence avec un standardiste humain. Et surtout : mieux vaut une IA qui répond qu'un téléphone qui sonne dans le vide.",
  },
  {
    q: "Je peux essayer avant de m'engager ?",
    a: "Cobeone est gratuit, tu peux tester tout de suite. Pour DCG AI, contacte Cobi pour une démo personnalisée avec TON numéro de téléphone.",
  },
  {
    q: "Quelle différence avec PagesJaunes ou Google ?",
    a: "PagesJaunes te liste. Cobeone te connecte directement aux clients ET gère tout : paiement, avis, communication. C'est ta vitrine + ton standard + ton community manager en un seul endroit.",
  },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <button
      onClick={() => setOpen(!open)}
      className="w-full text-left border border-border/50 rounded-xl p-5 hover:border-primary/30 transition-colors"
    >
      <div className="flex items-center justify-between gap-4">
        <span className="font-medium text-foreground">{q}</span>
        {open ? <ChevronUp className="h-5 w-5 shrink-0 text-primary" /> : <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />}
      </div>
      {open && <p className="mt-3 text-muted-foreground text-sm leading-relaxed">{a}</p>}
    </button>
  )
}

// ============================================
// Page principale
// ============================================
export default function OffreProPage() {
  const [showSticky, setShowSticky] = useState(false)
  const ctaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      const ctaTop = ctaRef.current?.offsetTop || Infinity
      const windowHeight = window.innerHeight
      setShowSticky(scrollY > windowHeight * 0.5 && scrollY + windowHeight < ctaTop)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="bg-background text-foreground">
      {/* ============================================ */}
      {/* SECTION 1 — HERO */}
      {/* ============================================ */}
      <section className="relative overflow-hidden py-16 md:py-24 px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        <div className="relative max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Badge variant="secondary" className="mb-6 text-sm px-4 py-1.5">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Offre de lancement Guadeloupe
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold leading-tight"
          >
            Tu perds des clients chaque jour où ton téléphone{' '}
            <span className="text-primary">sonne dans le vide.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto"
          >
            Cobeone donne aux pros de Guadeloupe une intelligence artificielle qui répond à ta place, une vitrine digitale, et des clients qui te trouvent sans pub Facebook. Rejoins les premiers — c'est gratuit pour commencer.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button size="lg" asChild>
              <Link href="/inscription/professionnel">
                Je veux mes clients
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="https://wa.me/33159580747" target="_blank">
                <MessageCircle className="mr-2 h-4 w-4" />
                Parler à Cobi
              </Link>
            </Button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-4 text-sm text-muted-foreground"
          >
            Inscription gratuite sur Cobeone. Sans engagement. Sans CB.
          </motion.p>
        </div>
      </section>

      {/* ============================================ */}
      {/* SECTION 2 — LE PROBLÈME */}
      {/* ============================================ */}
      <AnimatedSection className="py-16 md:py-20 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <motion.h2 variants={fadeUp} className="font-heading text-2xl sm:text-3xl font-bold text-center">
            Tu te reconnais ?
          </motion.h2>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                icon: PhoneOff,
                emoji: '📵',
                title: 'Appels manqués',
                text: 'Un touriste appelle à 22h depuis Paris. Tu dors. Il réserve chez ton concurrent.',
              },
              {
                icon: Search,
                emoji: '🔍',
                title: 'Invisible en ligne',
                text: "Tu n'as ni site, ni fiche Google à jour. Les gens cherchent, mais ils ne te trouvent pas.",
              },
              {
                icon: Clock,
                emoji: '📱',
                title: 'Pas le temps',
                text: "Tu sais qu'il faut poster sur Instagram, mais entre les clients et la compta, c'est toujours pour demain.",
              },
            ].map((item, i) => (
              <motion.div key={i} variants={fadeUp}>
                <Card className="h-full border-border/50 hover:border-primary/30 transition-colors">
                  <CardContent className="pt-6">
                    <span className="text-3xl">{item.emoji}</span>
                    <h3 className="mt-3 font-heading font-semibold text-lg">{item.title}</h3>
                    <p className="mt-2 text-muted-foreground text-sm leading-relaxed">{item.text}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.p variants={fadeUp} className="mt-10 text-center text-muted-foreground italic">
            Et si tout ça se réglait en une semaine, sans que tu changes tes habitudes ?
          </motion.p>
        </div>
      </AnimatedSection>

      {/* ============================================ */}
      {/* SECTION 3 — LES 3 PILIERS */}
      {/* ============================================ */}
      <AnimatedSection className="py-16 md:py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.h2 variants={fadeUp} className="font-heading text-2xl sm:text-3xl font-bold text-center">
            3 outils. <span className="text-primary">0 prise de tête.</span>
          </motion.h2>

          <div className="mt-10 space-y-6">
            {/* Pilier 1 — Cobeone */}
            <motion.div variants={fadeUp}>
              <Card className="border-2 border-green-500/30 bg-green-50/50 dark:bg-green-950/10">
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-xl font-heading">Cobeone — Tes clients te trouvent</CardTitle>
                    <Badge className="bg-green-500 text-white">GRATUIT</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Ton profil pro sur la super-app de Guadeloupe. Les habitants et les touristes te découvrent, te contactent et te paient — directement depuis leur téléphone. Zéro pub à payer.
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Commission de 15% sur les ventes via l'app, dégressive jusqu'à 1%.{' '}
                    <strong className="text-foreground">Early adopter : 0% le premier mois</strong> si tu fais partie des 5 premiers de ta catégorie.
                  </p>
                  <Button variant="outline" size="sm" className="mt-4" asChild>
                    <Link href="/inscription/professionnel">S'inscrire gratuitement <ArrowRight className="ml-1 h-3 w-3" /></Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Pilier 2 — SparkHub */}
            <motion.div variants={fadeUp}>
              <Card className="border-2 border-primary/30 bg-primary/5">
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-xl font-heading">SparkHub — Ton marketing en pilote automatique</CardTitle>
                    <Badge variant="secondary">OFFERT avec DCG AI</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Posts réseaux sociaux, mini-site vitrine, studio photo IA, menu restaurant digital, logo express, vidéos promo. Tout ce qu'une agence te facturerait 500€/mois, en quelques clics.
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Valeur : 9,90€/mois — <strong className="text-foreground">Offert</strong> quand tu prends DCG AI.
                  </p>
                  <Button variant="outline" size="sm" className="mt-4" asChild>
                    <Link href="/outils">Découvrir les outils <ArrowRight className="ml-1 h-3 w-3" /></Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Pilier 3 — DCG AI */}
            <motion.div variants={fadeUp}>
              <Card className="border-2 border-secondary/30 bg-secondary/5">
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-xl font-heading">DCG AI — Une IA qui décroche à ta place, 24h/24</CardTitle>
                    <Badge className="bg-secondary text-white">LE GAME-CHANGER</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Un agent vocal intelligent, personnalisé avec TES services, TES tarifs. Il répond au téléphone, prend les rendez-vous, collecte les avis Google. Même à 3h du matin quand un touriste appelle de New York.
                  </p>
                  <Button variant="outline" size="sm" className="mt-4" asChild>
                    <a href="#tarifs">Voir les tarifs <ArrowRight className="ml-1 h-3 w-3" /></a>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </AnimatedSection>

      {/* ============================================ */}
      {/* SECTION 4 — SCÉNARIOS */}
      {/* ============================================ */}
      <AnimatedSection className="py-16 md:py-20 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <motion.h2 variants={fadeUp} className="font-heading text-2xl sm:text-3xl font-bold text-center">
            Imagine ça, <span className="text-primary">dès la semaine prochaine...</span>
          </motion.h2>

          <div className="mt-10 space-y-6">
            {[
              {
                emoji: '🍽️',
                name: 'Marie, restauratrice à Sainte-Anne',
                story: "Il est 21h, elle ferme son restaurant. Son IA DCG AI répond à un couple de Montréal qui veut réserver pour demain midi. À son réveil, la réservation est dans son agenda. Le couple laisse un avis 5 étoiles sur Google.",
              },
              {
                emoji: '🔧',
                name: 'Kévin, plombier aux Abymes',
                story: "Il est sous un évier, les mains pleines. 3 appels manqués en 20 minutes. Avant DCG AI, c'était 3 clients perdus. Maintenant, l'IA répond, note le problème, et rappelle le client automatiquement.",
              },
              {
                emoji: '💇',
                name: 'Vanessa, coiffeuse à Pointe-à-Pitre',
                story: "Elle n'a jamais posté sur Instagram. Avec SparkHub, elle crée ses visuels en 30 secondes. Son profil Cobeone lui amène 4 nouvelles clientes par mois sans dépenser 1€ en pub.",
              },
            ].map((item, i) => (
              <motion.div key={i} variants={fadeUp} className="flex gap-4">
                <span className="text-3xl shrink-0 mt-1">{item.emoji}</span>
                <div>
                  <h3 className="font-heading font-semibold">{item.name}</h3>
                  <p className="mt-1 text-muted-foreground text-sm leading-relaxed">{item.story}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.p variants={fadeUp} className="mt-10 text-center font-medium text-foreground">
            Ce n'est pas de la science-fiction. C'est ce que Cobeone rend possible dès aujourd'hui.
          </motion.p>
        </div>
      </AnimatedSection>

      {/* ============================================ */}
      {/* SECTION 5 — TARIFS DCG AI */}
      {/* ============================================ */}
      <AnimatedSection id="tarifs" className="py-16 md:py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} className="text-center">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold">
              Combien ça coûte de ne plus jamais <span className="text-primary">perdre un appel</span> ?
            </h2>
            <p className="mt-3 text-muted-foreground">Moins qu'un employé à mi-temps. Plus fiable qu'un répondeur.</p>
          </motion.div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                name: 'Starter',
                oldPrice: '397',
                price: '197',
                popular: false,
                features: ['Téléphone IA personnalisé', 'Collecte d\'avis Google', 'Rapport d\'appels'],
              },
              {
                name: 'Business',
                oldPrice: '597',
                price: '347',
                popular: true,
                features: ['Tout Starter +', 'WhatsApp, Instagram, Messenger', 'CRM intégré (fiches clients auto)', 'Employé virtuel'],
              },
              {
                name: 'Premium',
                oldPrice: '797',
                price: '497',
                popular: false,
                features: ['Tout Business +', 'Prise de RDV automatique', 'Relances clients intelligentes', 'Analyse conversationnelle IA'],
              },
            ].map((plan, i) => (
              <motion.div key={i} variants={fadeUp}>
                <Card className={`h-full relative ${plan.popular ? 'border-2 border-primary shadow-lg shadow-primary/10' : 'border-border/50'}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">POPULAIRE</Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pb-2">
                    <CardTitle className="text-lg font-heading">{plan.name}</CardTitle>
                    <div className="mt-2">
                      <span className="text-sm text-muted-foreground line-through">{plan.oldPrice}€/mois</span>
                      <div className="text-4xl font-bold text-foreground">{plan.price}€<span className="text-base font-normal text-muted-foreground">/mois</span></div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {plan.features.map((f, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button className="w-full mt-6" variant={plan.popular ? 'default' : 'outline'} asChild>
                      <Link href="https://api.digital-code-growth.com/widget/booking/LRaECnfnDuuZ7d22mo7" target="_blank">
                        Choisir {plan.name}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Installation + Bonus */}
          <motion.div variants={fadeUp} className="mt-8 grid gap-4 md:grid-cols-2">
            <Card className="border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <h3 className="font-heading font-semibold">Installation & personnalisation</h3>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  <span className="line-through">997€</span> → <strong className="text-foreground text-lg">297€</strong> — On configure tout pour toi : ta voix IA, tes services, tes horaires, ton CRM. Tu n'as rien à faire.
                </p>
              </CardContent>
            </Card>

            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-primary" />
                  <h3 className="font-heading font-semibold">Bonus abonné DCG AI</h3>
                </div>
                <ul className="mt-2 space-y-1.5 text-sm">
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary" /> SparkHub offert (valeur 9,90€/mois)</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary" /> Commission Cobeone réduite à 5% au lieu de 15%</li>
                  <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary" /> Priorité support & nouvelles fonctionnalités</li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </AnimatedSection>

      {/* ============================================ */}
      {/* SECTION 6 — PARRAINAGE */}
      {/* ============================================ */}
      <AnimatedSection className="py-16 md:py-20 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <motion.h2 variants={fadeUp} className="font-heading text-2xl sm:text-3xl font-bold text-center">
            Gagne de l'argent <span className="text-primary">en parlant de Cobeone.</span>
          </motion.h2>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <motion.div variants={fadeUp}>
              <Card className="h-full">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-5 w-5 text-primary" />
                    <h3 className="font-heading font-semibold">Parrainage Pros</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Invite d'autres pros à rejoindre Cobeone. Pour chaque filleul actif, tu débloques des avantages exclusifs sur la plateforme.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Card className="h-full border-primary/30">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <h3 className="font-heading font-semibold">Parrainage Clients — 4 niveaux</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                    Télécharge aussi l'app Client. Chaque personne que tu parraines te rapporte une commission sur TOUTES ses transactions :
                  </p>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {[
                      { level: 'N1', pct: '10%' },
                      { level: 'N2', pct: '8%' },
                      { level: 'N3', pct: '6%' },
                      { level: 'N4', pct: '4%' },
                    ].map((l, i) => (
                      <div key={i} className="rounded-lg bg-primary/10 p-2">
                        <div className="text-xs text-muted-foreground">{l.level}</div>
                        <div className="text-lg font-bold text-primary">{l.pct}</div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground italic">
                    Ton cousin inscrit sa copine, qui inscrit sa mère, qui commande un traiteur → tu touches 6%.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.p variants={fadeUp} className="mt-8 text-center font-medium text-foreground">
            En Guadeloupe, tout le monde connaît tout le monde. <span className="text-primary">Ici, ça paye.</span>
          </motion.p>
        </div>
      </AnimatedSection>

      {/* ============================================ */}
      {/* SECTION 7 — FAQ */}
      {/* ============================================ */}
      <AnimatedSection className="py-16 md:py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.h2 variants={fadeUp} className="font-heading text-2xl sm:text-3xl font-bold text-center">
            Tu te poses encore des questions ?
          </motion.h2>

          <div className="mt-10 space-y-3">
            {faqs.map((faq, i) => (
              <motion.div key={i} variants={fadeUp}>
                <FaqItem q={faq.q} a={faq.a} />
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ============================================ */}
      {/* SECTION 8 — CTA FINAL */}
      {/* ============================================ */}
      <section ref={ctaRef} className="py-16 md:py-20 px-4 bg-gradient-to-br from-amber-500 via-orange-500 to-orange-600 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <Crown className="h-10 w-10 mx-auto mb-4 text-white/80" />
          <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold">
            Les 5 premières places de ta catégorie partent vite.
          </h2>
          <p className="mt-4 text-white/90 leading-relaxed">
            0% de commission le premier mois. Installation DCG AI à 297€ au lieu de 997€. Ces tarifs sont pour les premiers pros qui nous font confiance. Pas pour toujours.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-orange-600 hover:bg-white/90 font-semibold" asChild>
              <Link href="/inscription/professionnel">
                <Sparkles className="mr-2 h-4 w-4" />
                Je rejoins Cobeone maintenant
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white/50 text-white hover:bg-white/10" asChild>
              <Link href="https://wa.me/33159580747" target="_blank">
                <MessageCircle className="mr-2 h-4 w-4" />
                Parler à Cobi sur WhatsApp
              </Link>
            </Button>
          </div>

          <p className="mt-6 text-sm text-white/70">
            Inscription en 2 minutes. Profil en ligne aujourd'hui. Premiers clients cette semaine.
          </p>
        </div>
      </section>

      {/* ============================================ */}
      {/* FOOTER STICKY MOBILE */}
      {/* ============================================ */}
      {showSticky && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-3 bg-background/95 backdrop-blur-sm border-t border-border/50 md:hidden"
        >
          <Button className="w-full" size="lg" asChild>
            <Link href="/inscription/professionnel">
              Rejoindre Cobeone — C'est gratuit
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      )}
    </div>
  )
}
