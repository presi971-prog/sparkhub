import { LandingHeader, LandingFooter } from '@/components/landing'
import { SmoothScrollProvider } from '@/components/providers/smooth-scroll-provider'
import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'

// Composant async pour charger le user sans bloquer le rendu
async function HeaderWithUser() {
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

  return <LandingHeader user={profile} />
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SmoothScrollProvider>
      <div className="flex min-h-screen flex-col bg-background">
        <Suspense fallback={<LandingHeader user={null} />}>
          <HeaderWithUser />
        </Suspense>
        <main className="flex-1">{children}</main>
        <LandingFooter />
      </div>
    </SmoothScrollProvider>
  )
}
