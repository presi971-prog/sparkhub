import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 px-4">
        <div className="text-8xl font-heading font-bold text-primary/20">404</div>
        <h1 className="text-3xl font-heading font-bold text-foreground">
          Page introuvable
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Oups ! La page que tu cherches n&apos;existe pas ou a été déplacée.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Retour à l&apos;accueil
          </Link>
          <Link
            href="/tableau-de-bord"
            className="px-6 py-3 border border-border text-foreground rounded-lg font-medium hover:bg-accent/10 transition-colors"
          >
            Mon tableau de bord
          </Link>
        </div>
      </div>
    </div>
  )
}
