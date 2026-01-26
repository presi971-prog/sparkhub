'use client'

import { useState } from 'react'
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Coins, ChevronDown, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ResourceCardProps {
  title: string
  description: string
  details?: string
  credits: number
  isFree?: boolean
  disabled?: boolean
  onAction?: () => void
  actionLabel?: string
  href?: string
}

export function ResourceCard({
  title,
  description,
  details,
  credits,
  isFree = false,
  disabled = true,
  onAction,
  actionLabel = 'Bientôt disponible',
  href,
}: ResourceCardProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className="relative group perspective-1000"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Glow effect behind card */}
      <div
        className={cn(
          'absolute -inset-1 rounded-2xl opacity-0 blur-xl transition-all duration-500',
          'bg-gradient-to-r from-primary via-secondary to-primary',
          'group-hover:opacity-30 group-hover:animate-pulse'
        )}
      />

      {/* Animated border gradient */}
      <div
        className={cn(
          'absolute -inset-[1px] rounded-xl opacity-0 transition-opacity duration-300',
          'bg-gradient-to-r from-primary via-secondary to-primary bg-[length:200%_100%]',
          'group-hover:opacity-100 group-hover:animate-gradient-x'
        )}
      />

      <Card
        className={cn(
          'relative overflow-hidden transition-all duration-500 ease-out',
          'bg-card/95 backdrop-blur-sm',
          'group-hover:shadow-2xl group-hover:shadow-primary/10',
          'group-hover:-translate-y-2 group-hover:scale-[1.02]',
          showDetails && 'ring-2 ring-primary/30'
        )}
        style={{
          transform: isHovered
            ? `perspective(1000px) rotateX(2deg) translateY(-8px)`
            : 'perspective(1000px) rotateX(0deg) translateY(0px)',
        }}
      >
        {/* Animated background patterns */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Floating particles */}
          <div className={cn(
            'absolute top-4 right-4 w-2 h-2 rounded-full bg-primary/20',
            'transition-all duration-1000 ease-out',
            isHovered && 'animate-float-slow'
          )} />
          <div className={cn(
            'absolute top-8 right-12 w-1.5 h-1.5 rounded-full bg-secondary/30',
            'transition-all duration-1000 ease-out delay-100',
            isHovered && 'animate-float-medium'
          )} />
          <div className={cn(
            'absolute top-12 right-6 w-1 h-1 rounded-full bg-primary/25',
            'transition-all duration-1000 ease-out delay-200',
            isHovered && 'animate-float-fast'
          )} />

          {/* Gradient sweep */}
          <div
            className={cn(
              'absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10',
              'opacity-0 transition-opacity duration-500',
              'group-hover:opacity-100'
            )}
          />

          {/* Shine sweep effect */}
          <div
            className={cn(
              'absolute inset-0 -translate-x-full',
              'bg-gradient-to-r from-transparent via-white/20 to-transparent',
              'skew-x-12 transition-transform duration-1000 ease-out',
              'group-hover:translate-x-full'
            )}
          />
        </div>

        <CardHeader className="relative z-10">
          <div className="flex items-start justify-between gap-4">
            <CardTitle
              className={cn(
                'text-lg transition-all duration-300',
                'group-hover:text-primary group-hover:translate-x-1'
              )}
            >
              {title}
            </CardTitle>

            {/* Animated credit badge */}
            {isFree ? (
              <Badge
                variant="outline"
                className={cn(
                  'shrink-0 border-green-500 text-green-600 overflow-hidden relative',
                  'transition-all duration-500',
                  'group-hover:scale-110 group-hover:bg-green-500 group-hover:text-white',
                  'group-hover:shadow-lg group-hover:shadow-green-500/30'
                )}
              >
                <Sparkles className={cn(
                  'mr-1 h-3 w-3 transition-transform duration-500',
                  'group-hover:rotate-180'
                )} />
                Gratuit
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className={cn(
                  'shrink-0 overflow-hidden relative',
                  'transition-all duration-500 ease-out',
                  'group-hover:scale-110 group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-secondary',
                  'group-hover:text-white group-hover:shadow-lg group-hover:shadow-primary/30'
                )}
              >
                {/* Coin spin animation */}
                <Coins
                  className={cn(
                    'mr-1 h-3 w-3 transition-all duration-700',
                    'group-hover:rotate-[360deg] group-hover:scale-125'
                  )}
                />
                <span className="font-bold tabular-nums">{credits}</span>
                <span className="ml-1 text-xs opacity-80">crédits</span>

                {/* Shimmer effect on badge */}
                <div
                  className={cn(
                    'absolute inset-0 -translate-x-full',
                    'bg-gradient-to-r from-transparent via-white/30 to-transparent',
                    'transition-transform duration-700 delay-200',
                    'group-hover:translate-x-full'
                  )}
                />
              </Badge>
            )}
          </div>

          <CardDescription
            className={cn(
              'transition-all duration-300 delay-75',
              'group-hover:text-foreground/80'
            )}
          >
            {description}
          </CardDescription>

          {/* Details toggle button */}
          {details && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className={cn(
                'mt-3 flex items-center gap-2 text-sm font-medium',
                'text-muted-foreground hover:text-primary',
                'transition-all duration-300',
                showDetails && 'text-primary'
              )}
            >
              <span>En savoir plus</span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform duration-300',
                  showDetails && 'rotate-180'
                )}
              />
            </button>
          )}
        </CardHeader>

        {/* Expandable details section */}
        <div
          className={cn(
            'grid transition-all duration-500 ease-out',
            showDetails ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          )}
        >
          <div className="overflow-hidden">
            <div className="px-6 pb-4">
              <div className={cn(
                'rounded-xl p-4 text-sm',
                'bg-gradient-to-br from-muted/80 to-muted/40',
                'border border-border/50',
                'transform transition-all duration-500 delay-100',
                showDetails ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
              )}>
                <p className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Comment ça marche ?
                </p>
                <p className="text-muted-foreground leading-relaxed">{details}</p>
              </div>
            </div>
          </div>
        </div>

        <CardFooter className="relative z-10">
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'w-full inline-flex items-center justify-center gap-2',
                'rounded-md border border-input bg-background px-4 py-2',
                'text-sm font-medium transition-all duration-300',
                'hover:bg-primary hover:text-primary-foreground hover:border-primary',
                'relative overflow-hidden'
              )}
            >
              <span className="relative z-10">{actionLabel}</span>
              {/* Button hover fill effect */}
              <div
                className={cn(
                  'absolute inset-0 bg-primary',
                  'origin-left scale-x-0 transition-transform duration-300',
                  'group-hover:scale-x-100'
                )}
              />
            </a>
          ) : (
            <Button
              className={cn(
                'w-full relative overflow-hidden',
                'transition-all duration-300',
                !disabled && 'group-hover:bg-primary group-hover:text-primary-foreground'
              )}
              variant="outline"
              disabled={disabled}
              onClick={onAction}
            >
              <span className="relative z-10">{actionLabel}</span>

              {/* Button hover fill effect */}
              {!disabled && (
                <div
                  className={cn(
                    'absolute inset-0 bg-primary',
                    'origin-left scale-x-0 transition-transform duration-300',
                    'group-hover:scale-x-100'
                  )}
                />
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
