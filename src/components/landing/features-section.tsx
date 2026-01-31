'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import {
  Map,
  Star,
  CreditCard,
  Truck,
  Building2,
  Sparkles
} from 'lucide-react'

const features = [
  {
    icon: Map,
    title: 'Carte interactive',
    description: 'Les pros trouvent des livreurs fiables, les livreurs se rendent visibles sur toute la Guadeloupe.',
    iconColor: 'text-primary',
    bgColor: 'bg-primary/10'
  },
  {
    icon: Sparkles,
    title: 'Ressources IA',
    description: 'Photos, vidéos, textes, chatbots, outils métier... Tout pour développer votre activité.',
    iconColor: 'text-accent',
    bgColor: 'bg-accent/10'
  },
  {
    icon: Star,
    title: 'Gamification',
    description: 'Gagnez des points, montez en niveau, débloquez des badges et des réductions.',
    iconColor: 'text-warning',
    bgColor: 'bg-warning/10'
  },
  {
    icon: CreditCard,
    title: 'Crédits flexibles',
    description: 'Payez uniquement ce que vous utilisez. Pas d\'abonnement obligatoire.',
    iconColor: 'text-success',
    bgColor: 'bg-success/10'
  }
]

const benefits = {
  livreur: [
    'Profil visible sur la carte',
    'Outils IA pour votre marketing',
    'Badges et réputation',
    'Réductions Fondateur'
  ],
  professionnel: [
    'Trouvez des livreurs fiables',
    'Créez vos contenus en un clic',
    'Avis et évaluations',
    'Réductions Fondateur'
  ]
}

export function FeaturesSection() {
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section ref={ref} className="relative py-24 bg-background overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Tout ce dont vous avez besoin
          </div>

          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4 font-heading">
            Une plateforme,{' '}
            <span className="text-primary">
              mille possibilités
            </span>
          </h2>

          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Des outils puissants et une mise en relation directe entre livreurs et professionnels.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + index * 0.1 }}
              className="group relative p-6 rounded-2xl bg-card border border-border transition-all duration-300 hover:border-primary/30 hover:shadow-lg"
            >
              {/* Icon */}
              <div className={`w-12 h-12 rounded-xl ${feature.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
              </div>

              <h3 className="text-lg font-semibold text-foreground mb-2 font-heading">
                {feature.title}
              </h3>

              <p className="text-muted-foreground text-sm">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Benefits Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8"
        >
          {/* Livreurs Benefits */}
          <div className="relative p-8 rounded-3xl bg-card border border-border hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Truck className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground font-heading">Pour les Livreurs</h3>
                <p className="text-muted-foreground text-sm">Développez votre activité</p>
              </div>
            </div>

            <ul className="space-y-3">
              {benefits.livreur.map((benefit, index) => (
                <motion.li
                  key={benefit}
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <span className="text-foreground">{benefit}</span>
                </motion.li>
              ))}
            </ul>
          </div>

          {/* Professionnels Benefits */}
          <div className="relative p-8 rounded-3xl bg-card border border-border hover:border-secondary/30 transition-colors">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center">
                <Building2 className="w-7 h-7 text-secondary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground font-heading">Pour les Professionnels</h3>
                <p className="text-muted-foreground text-sm">Simplifiez votre quotidien</p>
              </div>
            </div>

            <ul className="space-y-3">
              {benefits.professionnel.map((benefit, index) => (
                <motion.li
                  key={benefit}
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-5 h-5 rounded-full bg-secondary/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-secondary" />
                  </div>
                  <span className="text-foreground">{benefit}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
