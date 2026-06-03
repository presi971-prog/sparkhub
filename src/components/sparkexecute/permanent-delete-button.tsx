'use client'

import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { toast } from 'sonner'

interface PermanentDeleteButtonProps {
  runId: string
}

/**
 * Bouton "Supprimer définitivement" affiché en absolute sur les cartes archivées.
 * Click → confirmation → DELETE ?permanent=true → vraie suppression DB → refresh liste.
 */
export function PermanentDeleteButton({ runId }: PermanentDeleteButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (isPending) return
    if (!confirm('Supprimer définitivement ce livrable ? Cette action est irréversible.')) return
    startTransition(async () => {
      try {
        const res = await fetch(`/api/sparkexecute/runs/${runId}?permanent=true`, {
          method: 'DELETE',
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        toast.success('Livrable supprimé définitivement.')
        router.refresh()
      } catch {
        toast.error('Suppression impossible. Réessaie dans un instant.')
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      title="Supprimer définitivement"
      aria-label="Supprimer définitivement"
      className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 bg-white text-red-600 shadow-sm transition hover:bg-red-50 hover:border-red-300 disabled:opacity-60"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  )
}
