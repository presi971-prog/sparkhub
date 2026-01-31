'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowRight, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface CreditPackButtonProps {
  packId: string
  priceId: string
  popular?: boolean
}

export function CreditPackButton({ packId, priceId, popular }: CreditPackButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handlePurchase = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          mode: 'payment',
          packId,
        }),
      })

      const data = await response.json()

      if (data.url) {
        router.push(data.url)
      } else {
        console.error('Erreur checkout:', data.error)
        alert('Erreur lors de la création du paiement. Veuillez réessayer.')
      }
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur de connexion. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      className="w-full mt-4"
      variant={popular ? 'default' : 'outline'}
      onClick={handlePurchase}
      disabled={loading}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Chargement...
        </>
      ) : (
        <>
          Acheter
          <ArrowRight className="ml-2 h-4 w-4" />
        </>
      )}
    </Button>
  )
}
