import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PromoProduitForm } from './promo-produit-form'

export const metadata: Metadata = {
  title: 'Promo Produit',
  description: 'Créez une vidéo promotionnelle avec un personnage généré présentant votre produit'
}

export default async function PromoProduitPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/connexion')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', user.id)
    .single()

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Promo Produit</h1>
        <p className="text-muted-foreground mt-1">
          Uploadez votre produit et un personnage généré le présentera en vidéo
        </p>
      </div>

      <PromoProduitForm
        userId={user.id}
        credits={profile?.credits || 0}
      />
    </div>
  )
}
