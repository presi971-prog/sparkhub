import Link from 'next/link'
import { MapPin, Mail, Phone } from 'lucide-react'

const footerLinks = {
  plateforme: [
    { name: 'Carte des livreurs', href: '/carte' },
    { name: 'Classement', href: '/classement' },
    { name: 'Tarifs', href: '/tarifs' },
    { name: 'Ressources', href: '/ressources' },
  ],
  entreprise: [
    { name: 'À propos', href: '/a-propos' },
    { name: 'Contact', href: '/contact' },
    { name: 'Blog', href: '/blog' },
    { name: 'Carrières', href: '/carrieres' },
  ],
  legal: [
    { name: 'Mentions légales', href: '/mentions-legales' },
    { name: 'CGU', href: '/cgu' },
    { name: 'Politique de confidentialité', href: '/confidentialite' },
    { name: 'Cookies', href: '/cookies' },
  ],
}

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
                S
              </div>
              <span className="font-heading text-xl font-bold">
                Spark<span className="text-primary">Hub</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Votre succès commence ici. La plateforme des livreurs et professionnels de Guadeloupe.
            </p>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>Guadeloupe, France</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <a href="mailto:contact@sparkhub.pro" className="hover:text-primary">
                  contact@sparkhub.pro
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <a href="tel:+590690000000" className="hover:text-primary">
                  +590 690 00 00 00
                </a>
              </div>
            </div>
          </div>

          {/* Plateforme */}
          <div>
            <h3 className="font-heading font-semibold">Plateforme</h3>
            <ul className="mt-4 space-y-2">
              {footerLinks.plateforme.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Entreprise */}
          <div>
            <h3 className="font-heading font-semibold">Entreprise</h3>
            <ul className="mt-4 space-y-2">
              {footerLinks.entreprise.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Légal */}
          <div>
            <h3 className="font-heading font-semibold">Légal</h3>
            <ul className="mt-4 space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 md:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} SparkHub. Tous droits réservés.
          </p>
          <p className="text-sm text-muted-foreground">
            Fait avec ❤️ en Guadeloupe
          </p>
        </div>
      </div>
    </footer>
  )
}
