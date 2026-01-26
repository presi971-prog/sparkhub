import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, FileText, Users, Settings, ArrowLeft } from 'lucide-react'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/connexion')
  }

  // Check if user is admin
  const { data: profileData } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = profileData as any

  if (profile?.role !== 'admin') {
    redirect('/tableau-de-bord')
  }

  const navItems = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Ressources', href: '/admin/ressources', icon: FileText },
    { name: 'Utilisateurs', href: '/admin/utilisateurs', icon: Users },
    { name: 'Paramètres', href: '/admin/parametres', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
                C
              </div>
              <span className="font-heading text-lg font-bold">
                Admin
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Button key={item.name} variant="ghost" size="sm" asChild>
                  <Link href={item.href}>
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.name}
                  </Link>
                </Button>
              ))}
            </nav>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/tableau-de-bord">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour au site
            </Link>
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="container py-8">
        {children}
      </main>
    </div>
  )
}
