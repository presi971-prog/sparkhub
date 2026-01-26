'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Menu, MapPin, Trophy, CreditCard, BookOpen, User, LogOut, Truck, Store, ChevronDown } from 'lucide-react'
import { TierCounter } from '@/components/tier-counter'
import { cn } from '@/lib/utils'

interface HeaderProps {
  user?: {
    id: string
    email: string
    full_name: string
  } | null
}

const navigation = [
  { name: 'Carte', href: '/carte', icon: MapPin },
  { name: 'Classement', href: '/classement', icon: Trophy },
  { name: 'Tarifs', href: '/tarifs', icon: CreditCard },
  { name: 'Ressources', href: '/ressources', icon: BookOpen },
]

export function Header({ user }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
            C
          </div>
          <span className="font-heading text-xl font-bold">
            Cobeone<span className="text-primary">Pro</span>
          </span>
        </Link>

        {/* Tier Counter (visible on desktop) */}
        <div className="hidden md:block">
          <TierCounter />
        </div>

        {/* Desktop Navigation */}
        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList>
            {navigation.map((item) => (
              <NavigationMenuItem key={item.name}>
                <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                  <Link href={item.href}>
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.name}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        {/* Desktop Auth Buttons */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Button variant="ghost" asChild>
                <Link href="/tableau-de-bord">
                  <User className="mr-2 h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
              <form action="/auth/signout" method="post">
                <Button variant="outline" type="submit">
                  <LogOut className="mr-2 h-4 w-4" />
                  Déconnexion
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/connexion">Connexion</Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>
                    S'inscrire
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/inscription/livreur" className="flex items-center cursor-pointer">
                      <Truck className="mr-2 h-4 w-4" />
                      Je suis Livreur
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/inscription/professionnel" className="flex items-center cursor-pointer">
                      <Store className="mr-2 h-4 w-4" />
                      Je suis Professionnel
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>

        {/* Mobile Menu */}
        {mounted ? (
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <div className="flex flex-col gap-6 pt-6">
                {/* Tier Counter Mobile */}
                <TierCounter />

                {/* Mobile Navigation */}
                <nav className="flex flex-col gap-2">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  ))}
                </nav>

                {/* Mobile Auth */}
                <div className="flex flex-col gap-2 border-t pt-4">
                  {user ? (
                    <>
                      <Button variant="outline" asChild className="justify-start">
                        <Link href="/tableau-de-bord" onClick={() => setMobileMenuOpen(false)}>
                          <User className="mr-2 h-4 w-4" />
                          Dashboard
                        </Link>
                      </Button>
                      <form action="/auth/signout" method="post">
                        <Button variant="ghost" type="submit" className="w-full justify-start">
                          <LogOut className="mr-2 h-4 w-4" />
                          Déconnexion
                        </Button>
                      </form>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" asChild>
                        <Link href="/connexion" onClick={() => setMobileMenuOpen(false)}>
                          Connexion
                        </Link>
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2 mb-1 px-1">S'inscrire en tant que :</p>
                      <Button asChild>
                        <Link href="/inscription/livreur" onClick={() => setMobileMenuOpen(false)}>
                          <Truck className="mr-2 h-4 w-4" />
                          Livreur
                        </Link>
                      </Button>
                      <Button variant="secondary" asChild>
                        <Link href="/inscription/professionnel" onClick={() => setMobileMenuOpen(false)}>
                          <Store className="mr-2 h-4 w-4" />
                          Professionnel
                        </Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        ) : (
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Menu</span>
          </Button>
        )}
      </div>
    </header>
  )
}
