import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PhotoPubProForm } from './photo-pub-pro-form'

export const metadata: Metadata = {
  title: 'Photo Pub Pro',
  description: 'Générez des photos professionnelles où vous apparaissez dans un nouveau contexte'
}

export default async function PhotoPubProPage() {
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
        <h1 className="text-2xl font-bold">Photo Pub Pro</h1>
        <p className="text-muted-foreground mt-1">
          Vois-toi autrement - même visage, nouveaux vêtements, nouveau décor
        </p>
      </div>

      <PhotoPubProForm
        userId={user.id}
        credits={profile?.credits || 0}
      />
    </div>
  )
}
