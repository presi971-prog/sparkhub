import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AvatarVideoForm } from './avatar-video-form'

export const metadata: Metadata = {
  title: 'Mon Avatar Video',
  description: 'Transformez votre photo en vidéo animée style influenceur'
}

export default async function AvatarVideoPage() {
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
        <h1 className="text-2xl font-bold">Mon Avatar Video</h1>
        <p className="text-muted-foreground mt-1">
          Uploadez votre photo et transformez-la en vidéo animée style influenceur
        </p>
      </div>

      <AvatarVideoForm
        userId={user.id}
        credits={profile?.credits || 0}
      />
    </div>
  )
}
