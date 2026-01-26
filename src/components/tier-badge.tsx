import { Badge } from '@/components/ui/badge'
import { TIERS, TierType } from '@/config/tiers'
import { cn } from '@/lib/utils'

interface TierBadgeProps {
  tier: TierType | string
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export function TierBadge({ tier, size = 'md', showLabel = true }: TierBadgeProps) {
  const tierConfig = TIERS[tier as TierType]

  if (!tierConfig) return null

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium',
        tierConfig.bgColor,
        tierConfig.borderColor,
        tierConfig.color,
        sizeClasses[size]
      )}
    >
      <span className="mr-1">{tierConfig.emoji}</span>
      {showLabel && tierConfig.displayName}
    </Badge>
  )
}
