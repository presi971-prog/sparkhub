import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Coins, ExternalLink, Sparkles, Lock } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Outils',
  description: 'Accédez aux outils IA de SparkHub',
}

export default async function OutilsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch profile with tier
  const { data: profileData } = await supabase
    .from('profiles')
    .select('tiers(name, discount_percent)')
    .eq('id', user.id)
    .single()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = profileData as any

  // Fetch credits
  const { data: creditsData } = await supabase
    .from('credits')
    .select('balance')
    .eq('profile_id', user.id)
    .single()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const credits = creditsData as any

  // Fetch active ressources
  const { data: ressourcesData } = await supabase
    .from('ressources')
    .select('*')
    .eq('is_active', true)
    .order('order_index')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ressources = ressourcesData as any[]

  const tierDiscount = profile?.tiers?.discount_percent || 0
  const balance = credits?.balance || 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold">Outils</h1>
        <p className="mt-2 text-muted-foreground">
          Accédez aux outils IA pour développer votre activité.
        </p>
      </div>

      {/* Credits info */}
      <Card className="bg-muted/30">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Coins className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold">{balance} crédits disponibles</p>
              {tierDiscount > 0 && (
                <p className="text-sm text-green-600">
                  Vous bénéficiez de -{tierDiscount}% sur les outils
                </p>
              )}
            </div>
          </div>
          <Button variant="outline" asChild>
            <Link href="/credits">Acheter des crédits</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Tools grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {ressources && ressources.length > 0 ? (
          ressources.map((ressource) => {
            const discountedCost = Math.round(ressource.credit_cost * (1 - tierDiscount / 100))
            const canAfford = balance >= discountedCost

            return (
              <Card key={ressource.id} className="overflow-hidden hover:border-primary/50 transition-colors">
                {ressource.image_url && (
                  <div className="aspect-video relative overflow-hidden bg-muted">
                    <Image
                      src={ressource.image_url}
                      alt={ressource.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{ressource.title}</CardTitle>
                    </div>
                    {ressource.credit_cost > 0 && (
                      <div className="text-right">
                        {tierDiscount > 0 ? (
                          <>
                            <Badge variant="secondary">
                              <Coins className="mr-1 h-3 w-3" />
                              {discountedCost}
                            </Badge>
                            <p className="text-xs text-muted-foreground line-through">
                              {ressource.credit_cost}
                            </p>
                          </>
                        ) : (
                          <Badge variant="secondary">
                            <Coins className="mr-1 h-3 w-3" />
                            {ressource.credit_cost}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <CardDescription>{ressource.description}</CardDescription>
                </CardHeader>
                <CardFooter>
                  {ressource.credit_cost === 0 ? (
                    <Button className="w-full" asChild>
                      <a href={ressource.url} target="_blank" rel="noopener noreferrer">
                        Accéder gratuitement
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  ) : canAfford ? (
                    <Button className="w-full" asChild>
                      <a href={ressource.url} target="_blank" rel="noopener noreferrer">
                        Utiliser ({discountedCost} crédits)
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  ) : (
                    <Button className="w-full" variant="outline" disabled>
                      <Lock className="mr-2 h-4 w-4" />
                      Crédits insuffisants
                    </Button>
                  )}
                </CardFooter>
              </Card>
            )
          })
        ) : (
          /* Placeholder tools */
          <>
            {[
              { title: 'Community Manager IA', desc: 'Gérez vos réseaux sociaux automatiquement', credits: 50 },
              { title: 'Création de Visuels', desc: 'Créez des visuels professionnels', credits: 30 },
              { title: 'Montage Vidéo', desc: 'Montez vos vidéos facilement', credits: 75 },
              { title: 'Comptabilité', desc: 'Suivez vos revenus et dépenses', credits: 40 },
              { title: 'Blog Automatisé', desc: 'Générez du contenu SEO', credits: 60 },
              { title: 'Guide du Livreur', desc: 'Tout pour réussir', credits: 0 },
            ].map((tool, index) => {
              const discountedCost = Math.round(tool.credits * (1 - tierDiscount / 100))

              return (
                <Card key={index} className="opacity-75">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-lg">{tool.title}</CardTitle>
                      </div>
                      {tool.credits > 0 && (
                        <Badge variant="outline">
                          <Coins className="mr-1 h-3 w-3" />
                          {discountedCost}
                        </Badge>
                      )}
                    </div>
                    <CardDescription>{tool.desc}</CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Button className="w-full" variant="outline" disabled>
                      Bientôt disponible
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </>
        )}
      </div>

      {/* Coming soon notice */}
      <Card className="bg-secondary/10 border-secondary/20">
        <CardContent className="py-6 text-center">
          <Sparkles className="h-8 w-8 text-secondary mx-auto mb-4" />
          <h3 className="font-semibold">Plus d'outils à venir</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Nous ajoutons régulièrement de nouveaux outils IA pour vous aider à développer votre activité.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
