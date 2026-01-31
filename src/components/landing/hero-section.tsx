'use client'

import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Truck, Building2 } from 'lucide-react'
import Link from 'next/link'

// Video background - aerial ocean waves
function VideoBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Video element - Aerial ocean waves */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source
          src="https://assets.mixkit.co/videos/25266/25266-720.mp4"
          type="video/mp4"
        />
      </video>

      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />

      {/* Colored tint overlay - Caribbean vibes */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-transparent to-orange-900/20" />
    </div>
  )
}

export function HeroSection() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const heroRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect()
        setMousePosition({
          x: (e.clientX - rect.left) / rect.width - 0.5,
          y: (e.clientY - rect.top) / rect.height - 0.5,
        })
      }
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <section ref={heroRef} className="relative min-h-screen overflow-hidden bg-black">
      <VideoBackground />

      {/* Spotlight effect following mouse */}
      <motion.div
        className="absolute w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"
        animate={{
          x: mousePosition.x * 200,
          y: mousePosition.y * 200,
        }}
        transition={{ type: 'spring', damping: 30, stiffness: 200 }}
        style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-20">
        {/* Floating badge */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <div className="relative mb-8">
            <motion.div
              className="absolute inset-0 bg-primary/20 rounded-full blur-xl"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="relative inline-flex items-center gap-2 px-6 py-3 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white text-sm font-medium shadow-lg">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </span>
              200 places Fondateur disponibles
            </span>
          </div>
        </motion.div>

        {/* Main title with gradient */}
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-5xl md:text-7xl lg:text-8xl font-bold text-center mb-6 font-heading tracking-tight drop-shadow-lg"
        >
          <span className="text-white">Livreurs</span>
          <br />
          <span className="relative">
            <span className="bg-gradient-to-r from-cyan-400 via-amber-400 to-orange-400 bg-clip-text text-transparent">
              &
            </span>
          </span>
          <br />
          <span className="text-white">Professionnels</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-xl md:text-2xl text-white/80 text-center max-w-2xl mb-12 font-light drop-shadow-md"
        >
          La plateforme qui connecte les talents de la{' '}
          <span className="text-cyan-400 font-medium">Guadeloupe</span>
        </motion.p>

        {/* CTA Cards */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl"
        >
          {/* Livreur Card */}
          <Link href="/inscription/livreur" className="group relative">
            <motion.div
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              className="relative p-8 rounded-3xl bg-black/50 backdrop-blur-md border border-white/20 overflow-hidden transition-all duration-500 hover:border-cyan-400/50 hover:shadow-2xl hover:shadow-cyan-400/20"
            >
              {/* Animated gradient on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Icon with glow */}
              <div className="relative mb-6">
                <motion.div
                  className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl"
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileHover={{ scale: 1.2, opacity: 1 }}
                />
                <div className="relative w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Truck className="w-8 h-8 text-primary" />
                </div>
              </div>

              <h3 className="text-2xl font-bold text-white mb-3 font-heading">
                Je suis Livreur
              </h3>

              <p className="text-white/70 mb-6">
                Rendez-vous visible sur la carte, développez votre réputation et accédez aux outils IA.
              </p>

              <div className="flex items-center text-cyan-400 font-semibold group-hover:gap-4 gap-2 transition-all duration-300">
                Créer mon profil
                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
              </div>
            </motion.div>
          </Link>

          {/* Professionnel Card */}
          <Link href="/inscription/professionnel" className="group relative">
            <motion.div
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              className="relative p-8 rounded-3xl bg-black/50 backdrop-blur-md border border-white/20 overflow-hidden transition-all duration-500 hover:border-orange-400/50 hover:shadow-2xl hover:shadow-orange-400/20"
            >
              {/* Animated gradient on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/0 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Icon with glow */}
              <div className="relative mb-6">
                <motion.div
                  className="absolute inset-0 bg-secondary/20 rounded-2xl blur-xl"
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileHover={{ scale: 1.2, opacity: 1 }}
                />
                <div className="relative w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
                  <Building2 className="w-8 h-8 text-secondary" />
                </div>
              </div>

              <h3 className="text-2xl font-bold text-white mb-3 font-heading">
                Je suis Professionnel
              </h3>

              <p className="text-white/70 mb-6">
                Trouvez des livreurs fiables en un clic et créez vos contenus avec nos ressources IA.
              </p>

              <div className="flex items-center text-orange-400 font-semibold group-hover:gap-4 gap-2 transition-all duration-300">
                Trouver des livreurs
                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
              </div>
            </motion.div>
          </Link>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="flex flex-col items-center gap-2 text-white/70"
          >
            <span className="text-xs uppercase tracking-widest">Découvrir</span>
            <div className="w-px h-8 bg-gradient-to-b from-white/70 to-transparent" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
