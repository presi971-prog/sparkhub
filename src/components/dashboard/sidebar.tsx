'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { TierBadge } from '@/components/tier-badge'
import {
  LayoutDashboard,
  User,
  CreditCard,
  Wrench,
  MapPin,
  Trophy,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  FileText,
  Users,
  MessageCircle
} from 'lucide-react'
import { useState } from 'react'
import { Profile, Tier } from '@/types/database'

interface Props {
  profile: Profile & { tiers: Tier | null }
}

const navigation = [
  { name: 'Tableau de bord', href: '/tableau-de-bord', icon: LayoutDashboard },
  { name: 'Mon Profil', href: '/profil', icon: User },
  { name: 'Mes Crédits', href: '/credits', icon: CreditCard },
  { name: 'Outils', href: '/outils', icon: Wrench },
  { name: 'Assistant WhatsApp', href: '/outils/assistant-whatsapp', icon: MessageCircle },
]

const secondaryNav = [
  { name: 'Carte', href: '/carte', icon: MapPin },
  { name: 'Classement', href: '/classement', icon: Trophy },
]

const adminNav = [
  { name: 'Dashboard Admin', href: '/admin', icon: Shield },
  { name: 'Ressources', href: '/admin/ressources', icon: FileText },
  { name: 'Utilisateurs', href: '/admin/utilisateurs', icon: Users },
]

export function DashboardSidebar({ profile }: Props) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-card border-r transform transition-transform duration-300 ease-in-out',
          'md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-2 border-b px-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
                S
              </div>
              <span className="font-heading text-lg font-bold">
                Spark<span className="text-primary">Hub</span>
              </span>
            </Link>
          </div>

          {/* User info */}
          <div className="border-b p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                {profile.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{profile.full_name}</p>
                <div className="flex items-center gap-2">
                  {profile.tiers && (
                    <TierBadge tier={profile.tiers.name} size="sm" />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {profile.points} pts
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>

            <div className="mt-6 pt-6 border-t">
              <p className="px-3 mb-2 text-xs font-medium text-muted-foreground uppercase">
                Explorer
              </p>
              <nav className="space-y-1">
                {secondaryNav.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                        isActive
                          ? 'bg-muted text-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  )
                })}
              </nav>
            </div>

            {/* Admin section - only visible for admins */}
            {profile.role === 'admin' && (
              <div className="mt-6 pt-6 border-t">
                <p className="px-3 mb-2 text-xs font-medium text-orange-600 uppercase flex items-center gap-2">
                  <Shield className="h-3 w-3" />
                  Administration
                </p>
                <nav className="space-y-1">
                  {adminNav.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                          isActive
                            ? 'bg-orange-500/10 text-orange-600'
                            : 'text-muted-foreground hover:bg-orange-500/5 hover:text-orange-600'
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.name}
                      </Link>
                    )
                  })}
                </nav>
              </div>
            )}
          </ScrollArea>

          {/* Bottom */}
          <div className="border-t p-4 space-y-2">
            <Link
              href="/profil"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Settings className="h-4 w-4" />
              Paramètres
            </Link>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Déconnexion
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  )
}
