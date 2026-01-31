'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { ArrowRight, Truck, Building2, Sparkles, Check } from 'lucide-react'
import Link from 'next/link'

const benefits = [
  'Inscription gratuite',
  '200 places Fondateur',
  'Ressources IA',
  'Support réactif'
]

export function CTASection() {
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section ref={ref} className="relative py-24 bg-primary overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '30px 30px'
          }}
        />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" />
            Rejoignez SparkHub aujourd'hui
          </div>

          {/* Title */}
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-6 font-heading">
            Prêt à transformer
            <br />
            votre activité ?
          </h2>

          {/* Benefits */}
          <div className="flex flex-wrap justify-center gap-4 mb-10">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                className="flex items-center gap-2 text-white/90"
              >
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
                {benefit}
              </motion.div>
            ))}
          </div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            {/* Livreur CTA */}
            <Link
              href="/inscription/livreur"
              className="group w-full sm:w-auto"
            >
              <div className="flex items-center justify-center gap-3 px-8 py-4 bg-white rounded-xl text-primary font-semibold transition-all duration-300 hover:bg-white/90 hover:shadow-lg">
                <Truck className="w-5 h-5" />
                Je suis Livreur
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
              </div>
            </Link>

            {/* Pro CTA */}
            <Link
              href="/inscription/professionnel"
              className="group w-full sm:w-auto"
            >
              <div className="flex items-center justify-center gap-3 px-8 py-4 bg-secondary rounded-xl text-white font-semibold transition-all duration-300 hover:bg-secondary/90 hover:shadow-lg">
                <Building2 className="w-5 h-5" />
                Je suis Professionnel
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
              </div>
            </Link>
          </motion.div>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-6 text-white/60 text-sm"
          >
            Compte Cobeone requis · Validation sous 24-48h
          </motion.p>
        </motion.div>
      </div>
    </section>
  )
}
