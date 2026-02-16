import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SparkVideoForm } from './spark-video-form'

export const metadata: Metadata = {
  title: 'Spark Vidéo',
  description: 'Décris ton idée de vidéo, l\'IA crée tout : images, clips, musique, montage final',
}

export default async function SparkVideoPage() {
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

  // Historique des jobs (via RLS, l'utilisateur ne voit que les siens)
  const { data: jobs } = await supabase
    .from('spark_video_jobs')
    .select('id, status, idea, tier, scenes_count, duration_seconds, credits_used, final_video_url, error, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Spark Vidéo</h1>
        <p className="text-muted-foreground mt-1">
          Décris ton idée, l&apos;IA crée tout : images, clips, musique et montage final
        </p>
      </div>

      <SparkVideoForm
        userId={user.id}
        credits={creditData?.balance || 0}
        previousJobs={jobs || []}
      />
    </div>
  )
}
