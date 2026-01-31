'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Sparkles, ChevronDown, Truck, Building2, LogIn, Sun, Moon } from 'lucide-react'

interface LandingHeaderProps {
  user?: { id: string; email: string; full_name: string } | null
}

const navItems = [
  { label: 'Carte', href: '/carte' },
  { label: 'Classement', href: '/classement' },
  { label: 'Tarifs', href: '/tarifs' },
  { label: 'Ressources IA', href: '/ressources' },
]

export function LandingHeader({ user }: LandingHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-background/90 backdrop-blur-xl border-b border-border'
            : 'bg-black/30 backdrop-blur-sm'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className={`font-bold text-xl ${isScrolled ? 'text-foreground' : 'text-white'}`}>
                Spark<span className="text-primary">Hub</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`transition-colors text-sm font-medium ${
                    isScrolled
                      ? 'text-muted-foreground hover:text-foreground'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-3">
              {/* Theme Toggle */}
              {mounted && (
                <button
                  onClick={toggleTheme}
                  className={`p-2 rounded-lg transition-colors ${
                    isScrolled
                      ? 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                      : 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white'
                  }`}
                  aria-label="Toggle theme"
                >
                  {theme === 'dark' ? (
                    <Sun className="w-5 h-5" />
                  ) : (
                    <Moon className="w-5 h-5" />
                  )}
                </button>
              )}

              {user ? (
                <Link
                  href="/tableau-de-bord"
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
                >
                  Mon tableau de bord
                </Link>
              ) : (
                <>
                  <Link
                    href="/connexion"
                    className={`px-4 py-2 transition-colors text-sm font-medium ${
                      isScrolled
                        ? 'text-muted-foreground hover:text-foreground'
                        : 'text-white/80 hover:text-white'
                    }`}
                  >
                    Connexion
                  </Link>

                  {/* Register Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setIsRegisterOpen(!isRegisterOpen)}
                      onBlur={() => setTimeout(() => setIsRegisterOpen(false), 150)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
                    >
                      S'inscrire
                      <ChevronDown className={`w-4 h-4 transition-transform ${isRegisterOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {isRegisterOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 mt-2 w-56 rounded-xl bg-card border border-border shadow-xl overflow-hidden"
                        >
                          <Link
                            href="/inscription/livreur"
                            className="flex items-center gap-3 px-4 py-3 hover:bg-primary/5 transition-colors"
                          >
                            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Truck className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <div className="text-foreground font-medium text-sm">Livreur</div>
                              <div className="text-muted-foreground text-xs">Créer mon profil</div>
                            </div>
                          </Link>
                          <Link
                            href="/inscription/professionnel"
                            className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/5 transition-colors border-t border-border"
                          >
                            <div className="w-9 h-9 rounded-lg bg-secondary/10 flex items-center justify-center">
                              <Building2 className="w-4 h-4 text-secondary" />
                            </div>
                            <div>
                              <div className="text-foreground font-medium text-sm">Professionnel</div>
                              <div className="text-muted-foreground text-xs">Trouver des livreurs</div>
                            </div>
                          </Link>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}
            </div>

            {/* Mobile: Theme Toggle + Menu Button */}
            <div className="flex md:hidden items-center gap-2">
              {mounted && (
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg bg-muted text-muted-foreground"
                  aria-label="Toggle theme"
                >
                  {theme === 'dark' ? (
                    <Sun className="w-5 h-5" />
                  ) : (
                    <Moon className="w-5 h-5" />
                  )}
                </button>
              )}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-foreground"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/95 backdrop-blur-xl md:hidden"
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-card border-l border-border"
            >
              <div className="flex flex-col h-full pt-20 pb-6 px-6">
                {/* Nav Items */}
                <nav className="flex flex-col gap-2">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors font-medium"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>

                <div className="my-6 border-t border-border" />

                {/* Actions */}
                {user ? (
                  <Link
                    href="/tableau-de-bord"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium text-center"
                  >
                    Mon tableau de bord
                  </Link>
                ) : (
                  <div className="flex flex-col gap-3">
                    <Link
                      href="/connexion"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-border text-foreground font-medium"
                    >
                      <LogIn className="w-4 h-4" />
                      Connexion
                    </Link>
                    <Link
                      href="/inscription/livreur"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium"
                    >
                      <Truck className="w-4 h-4" />
                      Je suis Livreur
                    </Link>
                    <Link
                      href="/inscription/professionnel"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-secondary text-secondary-foreground font-medium"
                    >
                      <Building2 className="w-4 h-4" />
                      Je suis Professionnel
                    </Link>
                  </div>
                )}

                {/* Bottom */}
                <div className="mt-auto text-center text-muted-foreground text-sm">
                  © 2026 SparkHub · Guadeloupe
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
