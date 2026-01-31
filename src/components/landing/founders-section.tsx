'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useEffect, useState } from 'react'
import { Crown, Trophy, Medal, Award, Zap, Clock } from 'lucide-react'

interface FounderSlots {
  livreur: {
    platine: number
    or: number
    argent: number
    bronze: number
  }
  professionnel: {
    platine: number
    or: number
    argent: number
    bronze: number
  }
}

const founderTiers = [
  {
    id: 'platine',
    name: 'Platine',
    icon: Crown,
    discount: 50,
    places: 10,
    color: 'from-cyan-400 to-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/30',
    textColor: 'text-primary'
  },
  {
    id: 'or',
    name: 'Or',
    icon: Trophy,
    discount: 30,
    places: 20,
    color: 'from-amber-400 to-yellow-500',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning/30',
    textColor: 'text-warning'
  },
  {
    id: 'argent',
    name: 'Argent',
    icon: Medal,
    discount: 20,
    places: 30,
    color: 'from-slate-300 to-slate-400',
    bgColor: 'bg-muted',
    borderColor: 'border-border',
    textColor: 'text-muted-foreground'
  },
  {
    id: 'bronze',
    name: 'Bronze',
    icon: Award,
    discount: 10,
    places: 40,
    color: 'from-orange-400 to-secondary',
    bgColor: 'bg-secondary/10',
    borderColor: 'border-secondary/30',
    textColor: 'text-secondary'
  }
]

function AnimatedNumber({ value, duration = 1 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (isInView) {
      let start = 0
      const end = value
      const increment = end / (duration * 60)
      const timer = setInterval(() => {
        start += increment
        if (start >= end) {
          setDisplayValue(end)
          clearInterval(timer)
        } else {
          setDisplayValue(Math.floor(start))
        }
      }, 1000 / 60)
      return () => clearInterval(timer)
    }
  }, [isInView, value, duration])

  return <span ref={ref}>{displayValue}</span>
}

function ProgressBar({ current, max, color }: { current: number; max: number; color: string }) {
  const percentage = Math.max(0, Math.min(100, ((max - current) / max) * 100))
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })

  return (
    <div ref={ref} className="w-full h-2 bg-muted rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={isInView ? { width: `${percentage}%` } : { width: 0 }}
        transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
        className={`h-full bg-gradient-to-r ${color} rounded-full`}
      />
    </div>
  )
}

export function FoundersSection() {
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  const [slots, setSlots] = useState<FounderSlots>({
    livreur: { platine: 10, or: 20, argent: 30, bronze: 40 },
    professionnel: { platine: 10, or: 20, argent: 30, bronze: 40 }
  })

  useEffect(() => {
    async function fetchSlots() {
      try {
        const response = await fetch('/api/founders/slots')
        if (response.ok) {
          const data = await response.json()

          // Handle both array format (from DB) and object format (fallback)
          if (Array.isArray(data)) {
            const newSlots: FounderSlots = {
              livreur: { platine: 10, or: 20, argent: 30, bronze: 40 },
              professionnel: { platine: 10, or: 20, argent: 30, bronze: 40 }
            }

            data.forEach((item: any) => {
              const type = item.user_type as 'livreur' | 'professionnel'
              if (newSlots[type]) {
                newSlots[type] = {
                  platine: Number(item.platine_available) || 0,
                  or: Number(item.or_available) || 0,
                  argent: Number(item.argent_available) || 0,
                  bronze: Number(item.bronze_available) || 0
                }
              }
            })

            setSlots(newSlots)
          }
          // Keep default slots if fallback object format is returned
        }
      } catch (error) {
        console.error('Failed to fetch founder slots:', error)
      }
    }

    fetchSlots()
  }, [])

  const getTotalRemaining = (type: 'livreur' | 'professionnel') => {
    const s = slots[type]
    return s.platine + s.or + s.argent + s.bronze
  }

  return (
    <section ref={ref} className="relative py-24 bg-muted/30 overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            Places limitées
          </div>

          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4 font-heading">
            Devenez{' '}
            <span className="text-primary">
              Fondateur
            </span>
          </h2>

          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Les 100 premiers de chaque catégorie bénéficient de réductions exclusives pendant 1 an.
          </p>
        </motion.div>

        {/* Two Columns: Livreurs & Pros */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Livreurs Column */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative p-6 rounded-3xl bg-card border border-border"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-foreground flex items-center gap-2 font-heading">
                <span className="text-2xl">🚚</span>
                Livreurs
              </h3>
              <div className="flex items-center gap-2 text-primary">
                <Clock className="w-4 h-4" />
                <span className="font-medium">
                  <AnimatedNumber value={getTotalRemaining('livreur')} /> places
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {founderTiers.map((tier, index) => {
                const remaining = slots.livreur[tier.id as keyof typeof slots.livreur]
                const isUrgent = remaining <= 3

                return (
                  <motion.div
                    key={tier.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                    className={`relative p-4 rounded-xl ${tier.bgColor} border ${tier.borderColor} ${isUrgent ? 'animate-pulse' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <tier.icon className={`w-5 h-5 ${tier.textColor}`} />
                        <span className="font-medium text-foreground">{tier.name}</span>
                        <span className={`text-sm font-bold ${tier.textColor}`}>
                          -{tier.discount}%
                        </span>
                      </div>
                      <div className={`text-sm font-semibold ${isUrgent ? 'text-destructive' : tier.textColor}`}>
                        {isUrgent && '🔥 '}{remaining} / {tier.places}
                      </div>
                    </div>
                    <ProgressBar current={remaining} max={tier.places} color={tier.color} />
                  </motion.div>
                )
              })}
            </div>
          </motion.div>

          {/* Professionnels Column */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative p-6 rounded-3xl bg-card border border-border"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-foreground flex items-center gap-2 font-heading">
                <span className="text-2xl">🏢</span>
                Professionnels
              </h3>
              <div className="flex items-center gap-2 text-secondary">
                <Clock className="w-4 h-4" />
                <span className="font-medium">
                  <AnimatedNumber value={getTotalRemaining('professionnel')} /> places
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {founderTiers.map((tier, index) => {
                const remaining = slots.professionnel[tier.id as keyof typeof slots.professionnel]
                const isUrgent = remaining <= 3

                return (
                  <motion.div
                    key={tier.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                    className={`relative p-4 rounded-xl ${tier.bgColor} border ${tier.borderColor} ${isUrgent ? 'animate-pulse' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <tier.icon className={`w-5 h-5 ${tier.textColor}`} />
                        <span className="font-medium text-foreground">{tier.name}</span>
                        <span className={`text-sm font-bold ${tier.textColor}`}>
                          -{tier.discount}%
                        </span>
                      </div>
                      <div className={`text-sm font-semibold ${isUrgent ? 'text-destructive' : tier.textColor}`}>
                        {isUrgent && '🔥 '}{remaining} / {tier.places}
                      </div>
                    </div>
                    <ProgressBar current={remaining} max={tier.places} color={tier.color} />
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        </div>

        {/* Duration Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-card border border-border text-muted-foreground">
            <span className="text-2xl">⏱️</span>
            <span>Réductions valables <strong className="text-foreground">1 an</strong> à partir de l'inscription</span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
