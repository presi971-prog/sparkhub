import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  MessageCircle, Settings, Calendar, Power, PowerOff,
  TrendingUp, Users, ArrowRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = {
  title: 'Assistant WhatsApp',
  description: 'Gérez votre assistant WhatsApp Cobeone',
}

export default async function AssistantWhatsAppPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/connexion')

  // Charger le commerce du pro
  const { data: commerce } = await supabase
    .from('commerces')
    .select('*')
    .eq('profile_id', user.id)
    .single()

  // Stats conversations (ce mois)
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

  let conversationsToday = 0
  let conversationsMonth = 0
  let reservationsPending = 0

  if (commerce) {
    const [{ count: todayCount }, { count: monthCount }, { count: pendingCount }] = await Promise.all([
      supabase
        .from('whatsapp_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('commerce_id', commerce.id)
        .gte('created_at', startOfDay),
      supabase
        .from('whatsapp_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('commerce_id', commerce.id)
        .gte('created_at', startOfMonth),
      supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('commerce_id', commerce.id)
        .eq('status', 'pending'),
    ])

    conversationsToday = todayCount || 0
    conversationsMonth = monthCount || 0
    reservationsPending = pendingCount || 0
  }

  const isConfigured = !!commerce
  const isActive = commerce?.is_active || false

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Assistant WhatsApp</h1>
          <p className="text-muted-foreground mt-1">
            Votre assistant intelligent sur WhatsApp
          </p>
        </div>
        {isConfigured && (
          <Badge
            variant={isActive ? 'default' : 'secondary'}
            className={isActive ? 'bg-green-500/10 text-green-600 border-green-500/30' : ''}
          >
            {isActive ? (
              <><Power className="h-3 w-3 mr-1" /> Actif</>
            ) : (
              <><PowerOff className="h-3 w-3 mr-1" /> Inactif</>
            )}
          </Badge>
        )}
      </div>

      {!isConfigured ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Configurez votre assistant</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Renseignez les informations de votre commerce pour activer l'assistant WhatsApp.
              Vos clients pourront poser des questions et faire des réservations directement via WhatsApp.
            </p>
            <Button asChild>
              <Link href="/outils/assistant-whatsapp/config">
                <Settings className="h-4 w-4 mr-2" />
                Configurer mon commerce
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Conversations aujourd'hui
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-blue-500" />
                  <span className="text-2xl font-bold">{conversationsToday}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Ce mois
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <span className="text-2xl font-bold">{conversationsMonth}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Réservations en attente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-orange-500" />
                  <span className="text-2xl font-bold">{reservationsPending}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Commerce info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{commerce.nom}</CardTitle>
                <Badge variant="outline">{commerce.type}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {commerce.description && (
                <p className="text-sm text-muted-foreground">{commerce.description}</p>
              )}
              {commerce.adresse && (
                <p className="text-sm"><span className="font-medium">Adresse :</span> {commerce.adresse}</p>
              )}
              {commerce.telephone && (
                <p className="text-sm"><span className="font-medium">Tél :</span> {commerce.telephone}</p>
              )}
            </CardContent>
          </Card>

          {/* Actions rapides */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="py-6">
                <Button variant="outline" className="w-full justify-between" asChild>
                  <Link href="/outils/assistant-whatsapp/config">
                    <span className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Configurer mon commerce
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="py-6">
                <Button variant="outline" className="w-full justify-between" asChild>
                  <Link href="/outils/assistant-whatsapp/reservations">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Voir les réservations
                      {reservationsPending > 0 && (
                        <Badge variant="destructive" className="ml-1">{reservationsPending}</Badge>
                      )}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
