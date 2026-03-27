'use client'

import { useEffect } from 'react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Erreur dashboard:', error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-6 px-4">
        <div className="text-6xl">⚠️</div>
        <h2 className="text-2xl font-heading font-bold text-foreground">
          Erreur de chargement
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Impossible de charger cette page. Réessaie dans quelques instants.
        </p>
        <button
          onClick={() => reset()}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Réessayer
        </button>
      </div>
    </div>
  )
}
