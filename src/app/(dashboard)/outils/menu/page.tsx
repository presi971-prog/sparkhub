import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MenuForm } from './menu-form'

export const metadata: Metadata = {
  title: 'Menu / Carte',
  description: 'Cree ton menu de restaurant en PDF, pret a imprimer',
}

export default async function MenuPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/connexion')
  }

  const { data: creditData } = await supabase
    .from('credits')
    .select('balance')
    .eq('profile_id', user.id)
    .single()

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Menu / Carte</h1>
        <p className="text-muted-foreground mt-1">
          Cree ton menu pro en PDF. Photo ou saisie manuelle, l'IA fait le reste.
        </p>
      </div>

      <MenuForm
        userId={user.id}
        credits={creditData?.balance || 0}
      />
    </div>
  )
}
