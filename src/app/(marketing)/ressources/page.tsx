import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/server'
import {
  Sparkles,
  ImageIcon,
  Video,
  FileText,
  BookOpen,
  Coins,
  ArrowRight,
  Pen,
  ExternalLink,
  Lock
} from 'lucide-react'
import { TOOLS_CONFIG } from '@/config/tiers'
import { ResourceCard } from '@/components/resource-card'

export const metadata: Metadata = {
  title: 'Ressources',
  description: 'Découvrez nos outils IA et ressources pour développer votre activité.',
}

const categoryIcons: Record<string, React.ElementType> = {
  marketing: Sparkles,
  formation: BookOpen,
  photo: ImageIcon,
  video: Video,
  default: FileText,
}

const categoryColors: Record<string, string> = {
  marketing: 'bg-purple-500/10 text-purple-600',
  formation: 'bg-green-500/10 text-green-600',
  photo: 'bg-blue-500/10 text-blue-600',
  video: 'bg-red-500/10 text-red-600',
  default: 'bg-gray-500/10 text-gray-600',
}

export default async function RessourcesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Abonnés connectés → vers le dashboard outils
  if (user) {
    redirect('/outils')
  }

  // Page marketing pour visiteurs non connectés
  let profile = null
  let credits = null
  let tierDiscount = 0
  let balance = 0

  if (user) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profileData } = await (supabase as any)
      .from('profiles')
      .select('tiers(name, discount_percent)')
      .eq('id', user.id)
      .single()
    profile = profileData as { tiers?: { name: string; discount_percent: number } } | null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: creditsData } = await (supabase as any)
      .from('credits')
      .select('balance')
      .eq('profile_id', user.id)
      .single()
    credits = creditsData as { balance: number } | null

    tierDiscount = profile?.tiers?.discount_percent || 0
    balance = credits?.balance || 0
  }

  // Fetch active ressources
  const { data: ressourcesData } = await supabase
    .from('ressources')
    .select('*')
    .eq('is_active', true)
    .order('order_index', { ascending: true })
  const ressources = ressourcesData as Array<{
    id: string
    title: string
    description: string
    details?: string
    credit_cost: number
    category: string
    url?: string
    image_url?: string
  }> | null

  // Group by category
  const categories = ressources?.reduce((acc, ressource) => {
    const cat = ressource.category
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(ressource)
    return acc
  }, {} as Record<string, typeof ressources>) || {}

  return (
    <div className="py-12 sm:py-16 md:py-24 lg:py-32">
      <div className="container">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="secondary" className="mb-4">
            Outils & Ressources
          </Badge>
          <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold lg:text-5xl">
            Des outils IA{' '}
            <span className="text-primary">professionnels</span>{' '}
            {user ? 'à votre disposition' : 'inclus dans votre abonnement'}
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Créez du contenu, développez votre présence en ligne et boostez votre activité
            grâce à nos outils IA.
          </p>
        </div>

        {/* Credits info - Only for logged in users */}
        {user && (
          <Card className="mt-8 bg-muted/30">
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
        )}

        {/* Avantages - Only for non-logged users */}
        {!user && (
          <div className="mt-8 sm:mt-10 md:mt-12 grid gap-3 sm:gap-4 sm:grid-cols-2 md:grid-cols-3">
            {[
              {
                icon: Sparkles,
                title: 'Outils IA Premium',
                description: 'Génération de textes, photos HD, vidéos avec Sora, Veo 3, Kling...',
              },
              {
                icon: Coins,
                title: 'Crédits mensuels',
                description: '50 à 200 crédits/mois selon votre tier d\'inscription',
              },
              {
                icon: Video,
                title: 'Qualité pro',
                description: 'Les mêmes outils que les agences, à une fraction du prix',
              },
            ].map((item) => (
              <Card key={item.title} className="bg-muted/30">
                <CardHeader className="flex flex-row items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    <CardDescription className="text-sm">{item.description}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {/* Ressources par catégorie */}
        {Object.keys(categories).length > 0 ? (
          Object.entries(categories).map(([category, items]) => {
            const IconComponent = categoryIcons[category] || categoryIcons.default
            const colorClass = categoryColors[category] || categoryColors.default
            const categoryItems = items || []

            return (
              <section key={category} className="mt-10 sm:mt-12 md:mt-16">
                <div className="flex items-center gap-3 mb-6 sm:mb-8">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorClass}`}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <h2 className="font-heading text-xl sm:text-2xl font-bold capitalize">{category}</h2>
                </div>

                <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {categoryItems.map((ressource) => {
                    const discountedCost = Math.round(ressource.credit_cost * (1 - tierDiscount / 100))
                    const canAfford = balance >= discountedCost

                    if (user) {
                      // Logged in user view
                      return (
                        <ResourceCard
                          key={ressource.id}
                          title={ressource.title}
                          description={ressource.description || ''}
                          details={ressource.details}
                          credits={tierDiscount > 0 ? discountedCost : ressource.credit_cost}
                          isFree={!ressource.credit_cost || ressource.credit_cost === 0}
                          disabled={!canAfford && ressource.credit_cost > 0}
                          actionLabel={
                            ressource.credit_cost === 0
                              ? 'Accéder gratuitement'
                              : canAfford
                              ? `Utiliser (${discountedCost} crédits)`
                              : 'Crédits insuffisants'
                          }
                          href={canAfford || ressource.credit_cost === 0 ? ressource.url : undefined}
                        />
                      )
                    } else {
                      // Non-logged user view
                      return (
                        <ResourceCard
                          key={ressource.id}
                          title={ressource.title}
                          description={ressource.description || ''}
                          details={ressource.details}
                          credits={ressource.credit_cost || 0}
                          isFree={!ressource.credit_cost || ressource.credit_cost === 0}
                          disabled={false}
                          actionLabel="S'inscrire pour accéder"
                          href="/inscription/livreur"
                        />
                      )
                    }
                  })}
                </div>
              </section>
            )
          })
        ) : (
          /* Placeholder when no ressources */
          <div className="mt-10 sm:mt-12 md:mt-16">
            {/* Section Texte */}
            <div className="mb-10 sm:mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
                  <Pen className="h-5 w-5" />
                </div>
                <h2 className="font-heading text-xl sm:text-2xl font-bold">Texte & Réseaux sociaux</h2>
              </div>
              <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <ResourceCard
                  title="Post IA"
                  description="Générez des posts engageants pour vos réseaux sociaux en quelques secondes."
                  details="Décrivez votre activité et le ton souhaité. L'IA génère plusieurs variantes de posts optimisés pour Facebook, Instagram ou LinkedIn."
                  credits={TOOLS_CONFIG.post_ia.credits}
                  actionLabel={user ? "Bientôt disponible" : "S'inscrire pour accéder"}
                  href={user ? undefined : "/inscription/livreur"}
                  disabled={!!user}
                />
                <ResourceCard
                  title="Légende & Bio"
                  description="Créez des légendes accrocheuses et des bios professionnelles."
                  details="Parfait pour vos profils réseaux sociaux ou descriptions de photos."
                  credits={TOOLS_CONFIG.legende.credits}
                  actionLabel={user ? "Bientôt disponible" : "S'inscrire pour accéder"}
                  href={user ? undefined : "/inscription/livreur"}
                  disabled={!!user}
                />
              </div>
            </div>

            {/* Section Photos */}
            <div className="mb-10 sm:mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <h2 className="font-heading text-xl sm:text-2xl font-bold">Photos IA</h2>
              </div>
              <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <ResourceCard
                  title="Photo Standard"
                  description="Générez des visuels de qualité pour vos publications."
                  details="Idéal pour les posts réseaux sociaux."
                  credits={TOOLS_CONFIG.photo_standard.credits}
                  actionLabel={user ? "Bientôt disponible" : "S'inscrire pour accéder"}
                  href={user ? undefined : "/inscription/livreur"}
                  disabled={!!user}
                />
                <ResourceCard
                  title="Photo Pro 4K"
                  description="Images haute définition pour vos supports professionnels."
                  details="Qualité impression et affichage grand format."
                  credits={TOOLS_CONFIG.photo_pro_4k.credits}
                  actionLabel={user ? "Bientôt disponible" : "S'inscrire pour accéder"}
                  href={user ? undefined : "/inscription/livreur"}
                  disabled={!!user}
                />
              </div>
            </div>

            {/* Section Vidéos */}
            <div className="mb-10 sm:mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-600">
                  <Video className="h-5 w-5" />
                </div>
                <h2 className="font-heading text-xl sm:text-2xl font-bold">Vidéos IA</h2>
              </div>
              <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <ResourceCard
                  title="Vidéo Kling 5s"
                  description="Vidéos courtes et dynamiques, idéales pour les stories."
                  credits={TOOLS_CONFIG.video_kling_5s.credits}
                  actionLabel={user ? "Bientôt disponible" : "S'inscrire pour accéder"}
                  href={user ? undefined : "/inscription/livreur"}
                  disabled={!!user}
                />
                <ResourceCard
                  title="Vidéo Sora 5s"
                  description="La puissance de Sora d'OpenAI pour des vidéos impressionnantes."
                  credits={TOOLS_CONFIG.video_sora_standard_5s.credits}
                  actionLabel={user ? "Bientôt disponible" : "S'inscrire pour accéder"}
                  href={user ? undefined : "/inscription/livreur"}
                  disabled={!!user}
                />
                <ResourceCard
                  title="Vidéo Veo 3 5s"
                  description="Technologie Google pour des rendus cinématographiques."
                  credits={TOOLS_CONFIG.video_veo3_5s.credits}
                  actionLabel={user ? "Bientôt disponible" : "S'inscrire pour accéder"}
                  href={user ? undefined : "/inscription/livreur"}
                  disabled={!!user}
                />
              </div>
            </div>

            {/* Section Ressources gratuites */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 text-green-600">
                  <BookOpen className="h-5 w-5" />
                </div>
                <h2 className="font-heading text-xl sm:text-2xl font-bold">Ressources gratuites</h2>
              </div>
              <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <ResourceCard
                  title="Guide du Livreur"
                  description="Tout ce qu'il faut savoir pour réussir en tant que livreur en Guadeloupe."
                  credits={0}
                  isFree
                  actionLabel={user ? "Accéder" : "S'inscrire pour accéder"}
                  href={user ? undefined : "/inscription/livreur"}
                  disabled={!!user}
                />
                <ResourceCard
                  title="Guide du Professionnel"
                  description="Comment optimiser vos livraisons et développer votre activité."
                  credits={0}
                  isFree
                  actionLabel={user ? "Accéder" : "S'inscrire pour accéder"}
                  href={user ? undefined : "/inscription/professionnel"}
                  disabled={!!user}
                />
              </div>
            </div>
          </div>
        )}

        {/* CTA - Only for non-logged users */}
        {!user && (
          <div className="mt-12 sm:mt-16 md:mt-20 rounded-2xl bg-primary/5 p-6 sm:p-8 text-center md:p-12">
            <h2 className="font-heading text-xl sm:text-2xl font-bold md:text-3xl">
              Inscrivez-vous pour accéder aux outils
            </h2>
            <p className="mt-4 text-muted-foreground">
              Plus vous vous inscrivez tôt, plus vous recevez de crédits chaque mois.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/inscription/livreur">
                  Je suis Livreur
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/inscription/professionnel">
                  Je suis Professionnel
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
