'use client'

import { Profile, Tier } from '@/types/database'
import { TierCounter } from '@/components/tier-counter'

interface Props {
  profile: Profile & { tiers: Tier | null }
}

export function DashboardHeader({ profile }: Props) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-6">
      <div className="md:hidden w-10" /> {/* Spacer for mobile menu button */}

      <div className="flex-1 flex justify-center md:justify-start">
        <TierCounter />
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          Bonjour, <span className="font-medium text-foreground">{profile.full_name.split(' ')[0]}</span>
        </span>
      </div>
    </header>
  )
}
