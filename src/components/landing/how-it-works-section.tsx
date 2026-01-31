'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import {
  UserPlus,
  MapPin,
  Search,
  Handshake,
  Sparkles,
  Star,
  ArrowRight,
  Truck,
  Building2
} from 'lucide-react'

const livreurSteps = [
  {
    icon: UserPlus,
    title: 'Inscrivez-vous',
    description: 'Créez votre profil avec vos infos et votre véhicule',
  },
  {
    icon: MapPin,
    title: 'Apparaissez sur la carte',
    description: 'Les pros de votre zone vous trouvent instantanément',
  },
  {
    icon: Sparkles,
    title: 'Utilisez les outils IA',
    description: 'Créez vos contenus et boostez votre visibilité',
  },
  {
    icon: Star,
    title: 'Développez votre réputation',
    description: 'Gagnez des points, des badges et des réductions',
  },
]

const proSteps = [
  {
    icon: UserPlus,
    title: 'Créez votre compte',
    description: 'Inscrivez votre entreprise en quelques clics',
  },
  {
    icon: Search,
    title: 'Trouvez des livreurs',
    description: 'Consultez la carte et les profils vérifiés',
  },
  {
    icon: Handshake,
    title: 'Contactez directement',
    description: 'Échangez et convenez des missions',
  },
  {
    icon: Sparkles,
    title: 'Créez vos contenus',
    description: 'Utilisez l\'IA pour votre marketing',
  },
]

const colorStyles = {
  primary: {
    connector: 'from-primary/30',
    border: 'hover:border-primary/30',
    badge: 'bg-primary text-primary-foreground',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  secondary: {
    connector: 'from-secondary/30',
    border: 'hover:border-secondary/30',
    badge: 'bg-secondary text-secondary-foreground',
    iconBg: 'bg-secondary/10',
    iconColor: 'text-secondary',
  },
}

function StepCard({ step, index, color, delay }: {
  step: typeof livreurSteps[0],
  index: number,
  color: 'primary' | 'secondary',
  delay: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })
  const styles = colorStyles[color]

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      className="relative"
    >
      {/* Connector line */}
      {index < 3 && (
        <div className={`hidden md:block absolute top-8 left-[calc(100%+0.5rem)] w-[calc(100%-1rem)] h-px bg-gradient-to-r ${styles.connector} to-transparent`} />
      )}

      <div className={`relative p-6 rounded-2xl bg-card border border-border ${styles.border} transition-all duration-300 hover:shadow-lg group`}>
        {/* Step number */}
        <div className={`absolute -top-3 -left-3 w-8 h-8 rounded-full ${styles.badge} flex items-center justify-center text-sm font-bold shadow-lg`}>
          {index + 1}
        </div>

        {/* Icon */}
        <div className={`w-14 h-14 rounded-xl ${styles.iconBg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
          <step.icon className={`w-7 h-7 ${styles.iconColor}`} />
        </div>

        <h4 className="font-bold text-foreground mb-2 font-heading">
          {step.title}
        </h4>

        <p className="text-sm text-muted-foreground">
          {step.description}
        </p>
      </div>
    </motion.div>
  )
}

export function HowItWorksSection() {
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section ref={ref} className="relative py-24 bg-muted/30 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-0 w-1/3 h-1/2 bg-primary/5 rounded-full blur-3xl -translate-y-1/2" />
        <div className="absolute top-1/2 right-0 w-1/3 h-1/2 bg-secondary/5 rounded-full blur-3xl -translate-y-1/2" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 font-heading">
            Comment ça{' '}
            <span className="text-primary">marche</span>
            {' '}?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Deux parcours simples pour deux profils différents
          </p>
        </motion.div>

        {/* Two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Livreurs Column */}
          <div>
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex items-center gap-4 mb-8"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
                <Truck className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-foreground font-heading">
                  Pour les Livreurs
                </h3>
                <p className="text-muted-foreground">
                  Développez votre activité
                </p>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {livreurSteps.map((step, index) => (
                <StepCard
                  key={step.title}
                  step={step}
                  index={index}
                  color="primary"
                  delay={0.3 + index * 0.1}
                />
              ))}
            </div>
          </div>

          {/* Professionnels Column */}
          <div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex items-center gap-4 mb-8"
            >
              <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center">
                <Building2 className="w-7 h-7 text-secondary-foreground" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-foreground font-heading">
                  Pour les Professionnels
                </h3>
                <p className="text-muted-foreground">
                  Simplifiez votre quotidien
                </p>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {proSteps.map((step, index) => (
                <StepCard
                  key={step.title}
                  step={step}
                  index={index}
                  color="secondary"
                  delay={0.3 + index * 0.1}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Connection visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-20 flex justify-center"
        >
          <div className="relative inline-flex items-center gap-4 px-8 py-4 rounded-full bg-card border border-border shadow-lg">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Truck className="w-6 h-6 text-primary" />
            </div>
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </motion.div>
              <span className="text-2xl">🤝</span>
              <motion.div
                animate={{ x: [0, -5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ArrowRight className="w-5 h-5 text-muted-foreground rotate-180" />
              </motion.div>
            </div>
            <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-secondary" />
            </div>
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-sm text-muted-foreground whitespace-nowrap">
              La rencontre se fait sur SparkHub
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
