import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardSidebar } from '@/components/dashboard/sidebar'
import { DashboardHeader } from '@/components/dashboard/header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/connexion')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, tiers(*)')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/connexion')
  }

  return (
    <div className="flex min-h-screen">
      <DashboardSidebar profile={profile} />
      <div className="flex-1 flex flex-col md:ml-64">
        <DashboardHeader profile={profile} />
        <main className="flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
