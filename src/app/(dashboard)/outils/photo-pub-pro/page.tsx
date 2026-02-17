import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StudioPhotoForm } from './photo-pub-pro-form'

export const metadata: Metadata = {
  title: 'SparkHub Studio Photo',
  description: 'Générez des photos hyperréalistes indiscernables de vraies photos grâce à l\'IA'
}

export default async function StudioPhotoPage() {
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
        <h1 className="text-2xl font-bold">SparkHub Studio Photo</h1>
        <p className="text-muted-foreground mt-1">
          Des photos hyperréalistes indiscernables de vraies photos
        </p>
      </div>

      <StudioPhotoForm
        userId={user.id}
        credits={creditData?.balance || 0}
      />
    </div>
  )
}
