import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen, Sparkles } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Spark Compta',
  description: 'Ton comptable de poche conversationnel — sur WhatsApp, dans SparkHub',
}

/**
 * Page d'accueil Spark Compta
 *
 * - Si l'utilisateur n'a pas encore de compte Spark Compta → redirige vers l'onboarding
 * - Si l'utilisateur a déjà un compte → redirige vers le dashboard
 * - En attendant les 2 routes, empty state chaleureux
 */
export default async function SparkComptaPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/connexion')

  // Charger le commerce du pro
  const { data: commerce } = await supabase
    .from('commerces')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  // Vérifier si un compte Spark Compta existe déjà
  let hasAccount = false
  if (commerce) {
    const { data: sparkComptaAccount } = await supabase
      .from('spark_compta_accounts')
      .select('id, onboarding_completed_at')
      .eq('commerce_id', commerce.id)
      .single()

    hasAccount = !!sparkComptaAccount?.onboarding_completed_at
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          Spark Compta
        </h1>
        <p className="text-muted-foreground mt-1">
          Ton comptable de poche conversationnel
        </p>
      </div>

      {!hasAccount ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Sparkles className="h-12 w-12 text-primary mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              Bienvenue dans Spark Compta
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Dis tes dépenses et tes recettes à WhatsApp.
              Spark Compta range, catégorise et te dit où tu en es,
              en temps réel, dans ton tableau de bord SparkHub.
            </p>
            <p className="text-sm text-muted-foreground mb-8 max-w-md">
              Inclus dans ton abonnement SparkHub. 150 actions
              gratuites par mois. Aucune carte bancaire supplémentaire.
            </p>
            <Button asChild size="lg">
              <Link href="/outils/spark-compta/onboarding">
                Commencer en 3 minutes
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <h2 className="text-xl font-semibold mb-4">
              Ton compte Spark Compta est prêt
            </h2>
            <Button asChild size="lg">
              <Link href="/outils/spark-compta/dashboard">
                Voir mon tableau de bord
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
