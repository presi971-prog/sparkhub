import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/content-machine/supabase-admin'
import { ContentMachineView } from './components/ContentMachineView'

export const metadata: Metadata = {
  title: 'DCG Content Machine',
  description: 'Gestion et validation du contenu généré automatiquement',
}

export default async function ContentMachinePage() {
  // Auth check via client normal
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Access control: only Thierry
  const email = user.email?.toLowerCase() || ''
  const isAuthorized = email === 'dcgcobeone@gmail.com' || email === 'presi971@gmail.com' || email.includes('thierry') || email.includes('trival')

  if (!isAuthorized) {
    redirect('/tableau-de-bord')
  }

  // Utiliser le service role pour lire les données (bypass RLS)
  const admin = createAdminSupabase()

  // Fetch contents from the last 24 hours
  const since = new Date()
  since.setHours(since.getHours() - 24)

  const { data: contentsData } = await admin
    .from('cm_contents')
    .select('*, brand:cm_brands(*), assets:cm_assets(*)')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contents = (contentsData as any[]) || []

  // Fetch this week's calendar
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)

  const { data: calendarData } = await admin
    .from('cm_calendar')
    .select('*, brand:cm_brands(*)')
    .gte('date', weekStart.toISOString().split('T')[0])
    .lte('date', weekEnd.toISOString().split('T')[0])
    .order('date', { ascending: true })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calendar = (calendarData as any[]) || []

  // Fetch all brands
  const { data: brandsData } = await admin
    .from('cm_brands')
    .select('*')
    .order('name')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const brands = (brandsData as any[]) || []

  return (
    <ContentMachineView
      contents={contents}
      calendar={calendar}
      brands={brands}
    />
  )
}
