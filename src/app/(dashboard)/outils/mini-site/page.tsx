import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MiniSiteForm } from './mini-site-form'

export const metadata: Metadata = {
  title: 'Mini Site Vitrine',
  description: 'Cree un site web pour ton commerce avec l\'IA',
}

export default async function MiniSitePage() {
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

  // Charger le site existant s'il y en a un
  const { data: existingSite } = await supabase
    .from('mini_sites')
    .select('*')
    .eq('profile_id', user.id)
    .single()

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Mini Site Vitrine</h1>
        <p className="text-muted-foreground mt-1">
          Cree un vrai site web pour ton commerce. L&apos;IA ecrit le texte et genere l&apos;image.
        </p>
      </div>

      <MiniSiteForm
        userId={user.id}
        credits={creditData?.balance || 0}
        existingSite={existingSite}
      />
    </div>
  )
}
