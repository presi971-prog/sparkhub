import { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  Pen
} from 'lucide-react'
import { TOOLS_CONFIG } from '@/config/tiers'
import { ResourceCard } from '@/components/resource-card'

export const metadata: Metadata = {
  title: 'Ressources',
  description: 'Découvrez nos outils IA et ressources pour développer votre activité de livreur.',
}

const categoryIcons: Record<string, React.ElementType> = {
  marketing: Sparkles,
  formation: BookOpen,
  default: FileText,
}

const categoryColors: Record<string, string> = {
  marketing: 'bg-purple-500/10 text-purple-600',
  formation: 'bg-green-500/10 text-green-600',
  default: 'bg-gray-500/10 text-gray-600',
}

export default async function RessourcesPage() {
  const supabase = await createClient()

  const { data: ressourcesData } = await supabase
    .from('ressources')
    .select('*')
    .eq('is_active', true)
    .order('order_index', { ascending: true })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ressources = ressourcesData as any[] | null

  // Group by category
  const categories = ressources?.reduce((acc, ressource) => {
    const cat = ressource.category
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(ressource)
    return acc
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }, {} as Record<string, any[]>) || {}

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
            inclus dans votre abonnement
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Créez du contenu, développez votre présence en ligne et boostez votre activité
            grâce à nos outils IA. Utilisez vos crédits mensuels comme vous voulez.
          </p>
        </div>

        {/* Avantages */}
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

        {/* Ressources par catégorie */}
        {Object.keys(categories).length > 0 ? (
          Object.entries(categories).map(([category, items]) => {
            const IconComponent = categoryIcons[category] || categoryIcons.default
            const colorClass = categoryColors[category] || categoryColors.default
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const categoryItems = items as any[]

            return (
              <section key={category} className="mt-10 sm:mt-12 md:mt-16">
                <div className="flex items-center gap-3 mb-6 sm:mb-8">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorClass}`}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <h2 className="font-heading text-xl sm:text-2xl font-bold capitalize">{category}</h2>
                </div>

                <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {categoryItems?.map((ressource) => (
                    <ResourceCard
                      key={ressource.id}
                      title={ressource.title}
                      description={ressource.description || ''}
                      details={ressource.details}
                      credits={ressource.credit_cost || 0}
                      isFree={!ressource.credit_cost || ressource.credit_cost === 0}
                      disabled={false}
                      actionLabel="Accéder"
                      href={ressource.url}
                    />
                  ))}
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
                  details="Décrivez votre activité et le ton souhaité. L'IA génère plusieurs variantes de posts optimisés pour Facebook, Instagram ou LinkedIn. Vous pouvez les modifier avant publication."
                  credits={TOOLS_CONFIG.post_ia.credits}
                />
                <ResourceCard
                  title="Légende & Bio"
                  description="Créez des légendes accrocheuses et des bios professionnelles."
                  details="Parfait pour vos profils réseaux sociaux ou descriptions de photos. Indiquez votre métier et vos points forts, l'IA crée une bio percutante qui attire les clients."
                  credits={TOOLS_CONFIG.legende.credits}
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
                  details="Idéal pour les posts réseaux sociaux. Décrivez l'image souhaitée et l'IA la génère en quelques secondes. Résolution optimisée pour le web et les réseaux."
                  credits={TOOLS_CONFIG.photo_standard.credits}
                />
                <ResourceCard
                  title="Photo Pro 4K"
                  description="Images haute définition pour vos supports professionnels."
                  details="Qualité impression et affichage grand format. Parfait pour flyers, affiches, cartes de visite. Résolution 4K avec détails fins et couleurs éclatantes."
                  credits={TOOLS_CONFIG.photo_pro_4k.credits}
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
                  details="Modèle Kling de Kuaishou. Génération rapide, idéal pour du contenu quotidien. Parfait pour stories Instagram/TikTok avec mouvements fluides."
                  credits={TOOLS_CONFIG.video_kling_5s.credits}
                />
                <ResourceCard
                  title="Vidéo Hailuo 5s"
                  description="Qualité supérieure pour vos contenus promotionnels."
                  details="Modèle Hailuo/Minimax. Excellent rapport qualité/prix. Rendu réaliste des personnages et décors. Idéal pour présentations produits."
                  credits={TOOLS_CONFIG.video_hailuo_5s.credits}
                />
                <ResourceCard
                  title="Vidéo Sora 5s"
                  description="La puissance de Sora d'OpenAI pour des vidéos impressionnantes."
                  details="Modèle Sora standard d'OpenAI. Compréhension avancée des prompts, mouvements naturels, cohérence visuelle exceptionnelle."
                  credits={TOOLS_CONFIG.video_sora_standard_5s.credits}
                />
                <ResourceCard
                  title="Vidéo Veo 3 5s"
                  description="Technologie Google pour des rendus cinématographiques."
                  details="Modèle Veo 3 de Google DeepMind. Qualité cinématographique, excellent pour publicités et contenus premium. Textures et lumières ultra-réalistes."
                  credits={TOOLS_CONFIG.video_veo3_5s.credits}
                />
                <ResourceCard
                  title="Vidéo Sora Pro 5s"
                  description="Qualité maximale avec le modèle Sora le plus avancé."
                  details="Version Pro de Sora. Résolution maximale, détails fins, mouvements complexes. Pour vos contenus les plus importants."
                  credits={TOOLS_CONFIG.video_sora_pro_5s.credits}
                />
                <ResourceCard
                  title="Vidéo Veo 3 + Audio"
                  description="Vidéo premium avec génération audio intégrée."
                  details="Le meilleur de Veo 3 avec une bande-son générée par IA. Musique et effets sonores synchronisés. Contenu prêt à publier."
                  credits={TOOLS_CONFIG.video_veo3_audio_5s.credits}
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
                  details="Guide complet : réglementation, zones rentables, conseils pratiques, gestion administrative, astuces pour maximiser vos revenus. Mis à jour régulièrement."
                  credits={0}
                  isFree
                />
                <ResourceCard
                  title="Guide du Professionnel"
                  description="Comment optimiser vos livraisons et développer votre activité."
                  details="Stratégies de fidélisation, optimisation des tournées, communication avec les livreurs, gestion des pics d'activité. Retours d'expérience de pros."
                  credits={0}
                  isFree
                />
              </div>
            </div>

            <p className="mt-8 text-center text-sm text-muted-foreground">
              Les outils seront disponibles dès le lancement de la plateforme.
            </p>
          </div>
        )}

        {/* CTA */}
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
      </div>
    </div>
  )
}
