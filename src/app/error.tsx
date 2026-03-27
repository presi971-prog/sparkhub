'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Erreur application:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 px-4">
        <div className="text-6xl">⚠️</div>
        <h1 className="text-3xl font-heading font-bold text-foreground">
          Une erreur est survenue
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Quelque chose s&apos;est mal passé. Réessaie ou retourne à l&apos;accueil.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Réessayer
          </button>
          <a
            href="/"
            className="px-6 py-3 border border-border text-foreground rounded-lg font-medium hover:bg-accent/10 transition-colors"
          >
            Retour à l&apos;accueil
          </a>
        </div>
      </div>
    </div>
  )
}
