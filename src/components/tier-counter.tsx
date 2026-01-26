'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TIERS, TIER_ORDER, TierType } from '@/config/tiers'
import { cn } from '@/lib/utils'

interface TierCount {
  tier: TierType
  count: number
  remaining: number
}

export function TierCounter() {
  const [tierCounts, setTierCounts] = useState<TierCount[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Fetch initial counts
    async function fetchCounts() {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('tier_id, tiers(name)')
        .eq('role', 'livreur')

      if (profiles) {
        const counts: Record<TierType, number> = {
          platine: 0,
          or: 0,
          argent: 0,
          bronze: 0,
          standard: 0,
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        profiles.forEach((profile: any) => {
          // Supabase returns tiers as an array, extract first element
          const tiers = Array.isArray(profile.tiers) ? profile.tiers[0] : profile.tiers
          const tierName = tiers?.name as TierType | undefined
          if (tierName && tierName in counts) {
            counts[tierName]++
          }
        })

        const newTierCounts = TIER_ORDER.filter(t => t !== 'standard').map((tier) => ({
          tier,
          count: counts[tier],
          remaining: TIERS[tier].maxPlaces - counts[tier],
        }))

        setTierCounts(newTierCounts)
      }
      setLoading(false)
    }

    fetchCounts()

    // Subscribe to realtime changes
    const channel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          // Refetch counts on any change
          fetchCounts()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-sm animate-pulse">
        <span className="h-4 w-32 bg-muted-foreground/20 rounded" />
      </div>
    )
  }

  // Find the first tier with remaining places
  const urgentTier = tierCounts.find((t) => t.remaining > 0)

  if (!urgentTier) {
    return (
      <div className="flex items-center gap-2 rounded-full bg-secondary/20 px-3 py-1.5 text-sm">
        <span className="text-secondary">🔥 Places limitées restantes !</span>
      </div>
    )
  }

  const tierConfig = TIERS[urgentTier.tier]

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-all',
        tierConfig.bgColor,
        tierConfig.borderColor,
        'border animate-pulse-slow'
      )}
    >
      <span>{tierConfig.emoji}</span>
      <span className={tierConfig.color}>
        Plus que {urgentTier.remaining} place{urgentTier.remaining > 1 ? 's' : ''} {tierConfig.displayName} !
      </span>
    </div>
  )
}
