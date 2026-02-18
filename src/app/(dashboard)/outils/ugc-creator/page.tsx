import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UgcCreatorForm } from './ugc-creator-form'

export const metadata: Metadata = {
  title: 'UGC Creator',
  description: 'Génère une vidéo publicitaire UGC à partir de ta photo produit ou mascotte',
}

export default async function UgcCreatorPage() {
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

  const { data: jobs } = await supabase
    .from('ugc_video_jobs')
    .select('id, status, type, qui, action, credits_used, video_url, error, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">UGC Creator</h1>
        <p className="text-muted-foreground mt-1">
          Génère une vidéo pub UGC à partir de ta photo produit ou mascotte
        </p>
      </div>
      <UgcCreatorForm
        userId={user.id}
        credits={creditData?.balance || 0}
        previousJobs={jobs || []}
      />
    </div>
  )
}
