import { LandingHeader, LandingFooter } from '@/components/landing'
import { createClient } from '@/lib/supabase/server'

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', user.id)
      .single()
    profile = data
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LandingHeader user={profile} />
      <main className="flex-1">{children}</main>
      <LandingFooter />
    </div>
  )
}
