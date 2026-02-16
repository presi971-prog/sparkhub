import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LogoExpressForm } from './logo-express-form'

export const metadata: Metadata = {
  title: 'Logo Express',
  description: 'Génère un logo professionnel + identité visuelle complète avec l\'IA'
}

export default async function LogoExpressPage() {
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
        <h1 className="text-2xl font-bold">Logo Express</h1>
        <p className="text-muted-foreground mt-1">
          Génère un logo pro + palette + carte de visite + bannière réseaux
        </p>
      </div>

      <LogoExpressForm
        userId={user.id}
        credits={creditData?.balance || 0}
      />
    </div>
  )
}
