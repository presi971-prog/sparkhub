import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Coins, TrendingUp, TrendingDown, ArrowRight, History } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Mes Crédits',
  description: 'Gérez vos crédits Cobeone Pro',
}

const creditPacks = [
  { credits: 50, price: 5, popular: false },
  { credits: 100, price: 9, popular: true, savings: '10%' },
  { credits: 250, price: 20, popular: false, savings: '20%' },
  { credits: 500, price: 35, popular: false, savings: '30%' },
]

export default async function CreditsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch credits
  const { data: creditsData } = await supabase
    .from('credits')
    .select('*')
    .eq('profile_id', user.id)
    .single()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const credits = creditsData as any

  // Fetch recent transactions
  const { data: transactionsData } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transactions = transactionsData as any[]

  // Fetch user tier for discount info
  const { data: profileData } = await supabase
    .from('profiles')
    .select('tier_id, tiers(name, discount_percent)')
    .eq('id', user.id)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = profileData as any
  const tierDiscount = profile?.tiers?.discount_percent || 0

  const transactionTypes: Record<string, { label: string; color: string }> = {
    purchase: { label: 'Achat', color: 'text-green-600' },
    spend: { label: 'Dépense', color: 'text-red-600' },
    refund: { label: 'Remboursement', color: 'text-blue-600' },
    bonus: { label: 'Bonus', color: 'text-yellow-600' },
    referral: { label: 'Parrainage', color: 'text-purple-600' },
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold">Mes Crédits</h1>
        <p className="mt-2 text-muted-foreground">
          Gérez vos crédits pour utiliser les outils de la plateforme.
        </p>
      </div>

      {/* Balance Card */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 bg-gradient-to-r from-primary/5 to-accent/5">
          <CardContent className="flex items-center justify-between py-6">
            <div>
              <p className="text-sm text-muted-foreground">Solde actuel</p>
              <p className="text-4xl font-bold">{credits?.balance || 0}</p>
              <p className="text-sm text-muted-foreground">crédits disponibles</p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Coins className="h-8 w-8" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-6 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total gagné</span>
              <span className="font-semibold text-green-600 flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                {credits?.lifetime_earned || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total dépensé</span>
              <span className="font-semibold text-red-600 flex items-center gap-1">
                <TrendingDown className="h-4 w-4" />
                {credits?.lifetime_spent || 0}
              </span>
            </div>
            {tierDiscount > 0 && (
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground">Votre réduction tier</p>
                <p className="font-bold text-primary">-{tierDiscount}% sur les outils</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Buy Credits */}
      <Card>
        <CardHeader>
          <CardTitle>Acheter des crédits</CardTitle>
          <CardDescription>
            Choisissez un pack de crédits. Plus vous achetez, plus vous économisez.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {creditPacks.map((pack) => (
              <Card
                key={pack.credits}
                className={cn(
                  'relative',
                  pack.popular && 'border-primary shadow-md'
                )}
              >
                {pack.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Populaire
                  </Badge>
                )}
                <CardContent className="pt-6 text-center">
                  <div className="flex items-center justify-center gap-1 text-3xl font-bold">
                    <Coins className="h-6 w-6 text-primary" />
                    {pack.credits}
                  </div>
                  <p className="text-sm text-muted-foreground">crédits</p>

                  <p className="mt-4 text-2xl font-bold">{pack.price}€</p>
                  {pack.savings && (
                    <Badge variant="secondary" className="mt-1">
                      Économisez {pack.savings}
                    </Badge>
                  )}

                  <Button className="w-full mt-4" variant={pack.popular ? 'default' : 'outline'}>
                    Acheter
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historique des transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions && transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.map((tx) => {
                const type = transactionTypes[tx.type] || transactionTypes.bonus
                const isPositive = tx.amount > 0

                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-full',
                        isPositive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                      )}>
                        {isPositive ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="font-medium">{tx.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(tx.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn('font-bold', type.color)}>
                        {isPositive ? '+' : ''}{tx.amount} crédits
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {type.label}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Aucune transaction pour le moment.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
