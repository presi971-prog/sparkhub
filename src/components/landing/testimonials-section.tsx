'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Star, Quote, Truck, Building2 } from 'lucide-react'

const testimonials = [
  {
    name: 'Marc L.',
    role: 'Livreur indépendant',
    type: 'livreur',
    avatar: 'M',
    rating: 5,
    text: 'Grâce à SparkHub, j\'ai pu créer des vidéos pro pour mes réseaux. Mes clients me trouvent directement sur la carte !',
    location: 'Pointe-à-Pitre'
  },
  {
    name: 'Sophie R.',
    role: 'Gérante de restaurant',
    type: 'professionnel',
    avatar: 'S',
    rating: 5,
    text: 'Je trouve des livreurs fiables en 2 clics et je crée mes posts Instagram avec l\'IA. Un gain de temps incroyable.',
    location: 'Les Abymes'
  },
  {
    name: 'Kevin D.',
    role: 'Coursier vélo',
    type: 'livreur',
    avatar: 'K',
    rating: 5,
    text: 'Fondateur Bronze, je profite de -10% sur tous les outils. Les badges motivent vraiment à être actif !',
    location: 'Baie-Mahault'
  },
  {
    name: 'Marie-Claire T.',
    role: 'Fleuriste',
    type: 'professionnel',
    avatar: 'M',
    rating: 5,
    text: 'Les ressources IA sont bluffantes. Mes clients adorent mes stories maintenant.',
    location: 'Sainte-Anne'
  }
]

export function TestimonialsSection() {
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/20 text-success text-sm font-medium mb-6">
            <Star className="w-4 h-4" fill="currentColor" />
            Témoignages
          </div>

          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4 font-heading">
            Ils nous font{' '}
            <span className="text-primary">
              confiance
            </span>
          </h2>

          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Livreurs et professionnels de Guadeloupe utilisent SparkHub au quotidien.
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + index * 0.1 }}
              className={`relative p-6 rounded-2xl bg-card border border-border transition-all duration-300 hover:shadow-lg ${
                testimonial.type === 'livreur'
                  ? 'hover:border-primary/30'
                  : 'hover:border-secondary/30'
              }`}
            >
              {/* Quote Icon */}
              <Quote className={`absolute top-4 right-4 w-8 h-8 opacity-10 ${
                testimonial.type === 'livreur' ? 'text-primary' : 'text-secondary'
              }`} />

              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-warning" fill="currentColor" />
                ))}
              </div>

              {/* Text */}
              <p className="text-foreground mb-6 leading-relaxed">
                "{testimonial.text}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold ${
                  testimonial.type === 'livreur'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-secondary/10 text-secondary'
                }`}>
                  {testimonial.avatar}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{testimonial.name}</span>
                    {testimonial.type === 'livreur' ? (
                      <Truck className="w-4 h-4 text-primary" />
                    ) : (
                      <Building2 className="w-4 h-4 text-secondary" />
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {testimonial.role} · {testimonial.location}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
