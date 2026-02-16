import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Instagram, Video, Camera, ShoppingBag, UtensilsCrossed,
  Coins, ArrowRight, Lock, Sparkles, MessageCircle, Globe, Palette
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TOOLS_CONFIG } from '@/config/tiers'

export const metadata: Metadata = {
  title: 'Outils IA',
  description: 'Tous les outils IA pour booster ton activité',
}

const tools = [
  {
    id: 'assistant-whatsapp',
    name: 'Assistant WhatsApp',
    description: 'Un assistant IA qui répond à vos clients sur WhatsApp. Menu, horaires, réservations.',
    icon: MessageCircle,
    credits: 0,
    href: '/outils/assistant-whatsapp',
    available: true,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    isFree: true,
  },
  {
    id: 'post-reseaux',
    name: 'Post Réseaux Sociaux',
    description: 'Uploade ta photo, on l\'améliore et on génère la légende + hashtags.',
    icon: Instagram,
    credits: TOOLS_CONFIG.post_reseaux.credits,
    href: '/outils/post-reseaux',
    available: true,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
  },
  {
    id: 'menu',
    name: 'Menu / Carte',
    description: 'Cree ton menu pro en PDF. Photo ou saisie manuelle, l\'IA fait le reste.',
    icon: UtensilsCrossed,
    credits: TOOLS_CONFIG.menu_generator.credits,
    href: '/outils/menu',
    available: true,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
  },
  {
    id: 'logo-express',
    name: 'Logo Express',
    description: 'Génère un logo pro + identité visuelle complète (palette, carte de visite, bannière).',
    icon: Palette,
    credits: TOOLS_CONFIG.logo_express.credits,
    href: '/outils/logo-express',
    available: true,
    color: 'text-fuchsia-500',
    bgColor: 'bg-fuchsia-500/10',
    borderColor: 'border-fuchsia-500/30',
  },
  {
    id: 'spark-video',
    name: 'Spark Vidéo',
    description: 'Décris ton idée de vidéo, l\'IA crée tout : images, clips, musique, montage final.',
    icon: Video,
    credits: TOOLS_CONFIG.spark_video_flash.credits,
    href: '/outils/spark-video',
    available: true,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    isVariablePrice: true,
  },
  {
    id: 'mini-site',
    name: 'Mini Site Vitrine',
    description: 'Cree un vrai site web pour ton commerce. L\'IA ecrit le texte et genere l\'image.',
    icon: Globe,
    credits: TOOLS_CONFIG.mini_site_vitrine.credits,
    href: '/outils/mini-site',
    available: true,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
  },
  {
    id: 'photo-pub-pro',
    name: 'Photo Pub Pro',
    description: 'Même visage, nouveaux vêtements, nouveau décor.',
    icon: Camera,
    credits: TOOLS_CONFIG.photo_pro_4k.credits,
    href: '/outils/photo-pub-pro',
    available: false,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  {
    id: 'promo-produit',
    name: 'Promo Produit',
    description: 'Un personnage généré présente ton produit en vidéo.',
    icon: ShoppingBag,
    credits: 15,
    href: '/outils/promo-produit',
    available: false,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
  },
  {
    id: 'avatar-video',
    name: 'Avatar Vidéo',
    description: 'Transforme ta photo en vidéo animée style influenceur.',
    icon: Video,
    credits: 15,
    href: '/outils/avatar-video',
    available: false,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
]

export default async function OutilsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/connexion')
  }

  const { data: creditData } = await supabase
    .from('credits')
    .select('balance')
    .eq('profile_id', user.id)
    .single()

  const balance = creditData?.balance || 0

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Outils IA</h1>
        <p className="text-muted-foreground mt-1">
          Tous les outils pour booster ton activité
        </p>
      </div>

      {/* Crédits */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Coins className="h-5 w-5 text-blue-500" />
            <span className="font-medium">{balance} crédits disponibles</span>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/credits">Acheter des crédits</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Grille outils */}
      <div className="grid gap-4 sm:grid-cols-2">
        {tools.map((tool) => {
          const Icon = tool.icon
          const canAfford = balance >= tool.credits

          return (
            <Card
              key={tool.id}
              className={`relative overflow-hidden transition-all ${
                tool.available
                  ? `hover:shadow-lg hover:border-primary/30 ${tool.borderColor}`
                  : 'opacity-60 border-border'
              }`}
            >
              {!tool.available && (
                <div className="absolute top-3 right-3">
                  <Badge variant="secondary" className="text-xs">
                    <Lock className="h-3 w-3 mr-1" />
                    Bientôt
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tool.bgColor}`}>
                    <Icon className={`h-5 w-5 ${tool.color}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{tool.name}</CardTitle>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Coins className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {'isFree' in tool && tool.isFree
                          ? 'Gratuit'
                          : 'isVariablePrice' in tool && tool.isVariablePrice
                            ? `À partir de ${tool.credits} crédits`
                            : `${tool.credits} crédits`}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{tool.description}</p>

                {tool.available ? (
                  <Button
                    className="w-full"
                    asChild
                    disabled={!canAfford}
                  >
                    <Link href={tool.href}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Utiliser
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                ) : (
                  <Button className="w-full" variant="outline" disabled>
                    <Lock className="h-4 w-4 mr-2" />
                    Bientôt disponible
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
