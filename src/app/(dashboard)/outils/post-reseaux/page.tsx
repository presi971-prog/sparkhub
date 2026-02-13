import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PostReseauxForm } from './post-reseaux-form'

export const metadata: Metadata = {
  title: 'Post Réseaux Sociaux',
  description: 'Génère un visuel pro + légende prêts à poster sur Instagram et Facebook'
}

export default async function PostReseauxPage() {
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
        <h1 className="text-2xl font-bold">Post Réseaux Sociaux</h1>
        <p className="text-muted-foreground mt-1">
          Upload ta photo, choisis ton style — on génère le visuel + la légende
        </p>
      </div>

      <PostReseauxForm
        userId={user.id}
        credits={creditData?.balance || 0}
      />
    </div>
  )
}
