'use client'

import Link from 'next/link'
import { Sparkles, MapPin, Mail, Phone, Instagram, Facebook, Linkedin } from 'lucide-react'

const footerLinks = {
  platform: [
    { label: 'Carte interactive', href: '/carte' },
    { label: 'Tarifs', href: '/tarifs' },
    { label: 'Ressources', href: '/ressources' },
    { label: 'Classement', href: '/classement' },
  ],
  company: [
    { label: 'À propos', href: '/a-propos' },
    { label: 'Contact', href: '/contact' },
    { label: 'Blog', href: '/blog' },
    { label: 'Partenaires', href: '/partenaires' },
  ],
  legal: [
    { label: 'CGU', href: '/cgu' },
    { label: 'Confidentialité', href: '/confidentialite' },
    { label: 'Mentions légales', href: '/mentions-legales' },
    { label: 'Cookies', href: '/cookies' },
  ],
}

const socialLinks = [
  { icon: Instagram, href: 'https://instagram.com/sparkhub.gp', label: 'Instagram' },
  { icon: Facebook, href: 'https://facebook.com/sparkhub.gp', label: 'Facebook' },
  { icon: Linkedin, href: 'https://linkedin.com/company/sparkhub', label: 'LinkedIn' },
]

export function LandingFooter() {
  return (
    <footer className="bg-card border-t border-border">
      <div className="max-w-7xl mx-auto px-4 py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl text-foreground">
                Spark<span className="text-primary">Hub</span>
              </span>
            </Link>

            <p className="text-muted-foreground text-sm mb-6 max-w-sm">
              La plateforme pour les livreurs et professionnels de Guadeloupe.
              Développez votre activité avec nos outils et notre réseau.
            </p>

            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-muted-foreground text-sm">
                <MapPin className="w-4 h-4 text-primary" />
                Guadeloupe, France
              </div>
              <div className="flex items-center gap-3 text-muted-foreground text-sm">
                <Mail className="w-4 h-4 text-primary" />
                contact@sparkhub.pro
              </div>
              <div className="flex items-center gap-3 text-muted-foreground text-sm">
                <Phone className="w-4 h-4 text-primary" />
                +590 690 XX XX XX
              </div>
            </div>

            {/* Social Links */}
            <div className="flex gap-3 mt-6">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-muted hover:bg-primary/10 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="text-foreground font-semibold mb-4">Plateforme</h4>
            <ul className="space-y-3">
              {footerLinks.platform.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-foreground font-semibold mb-4">Entreprise</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-foreground font-semibold mb-4">Légal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">
            © 2026 SparkHub. Tous droits réservés.
          </p>
          <p className="text-muted-foreground text-sm flex items-center gap-1">
            Fait avec <span className="text-destructive">❤️</span> en Guadeloupe
          </p>
        </div>
      </div>
    </footer>
  )
}
