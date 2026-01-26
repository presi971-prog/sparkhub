import { Metadata } from 'next'
import Link from 'next/link'
import { InscriptionLivreurForm } from '@/components/forms/inscription-livreur-form'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { TierCounter } from '@/components/tier-counter'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Inscription Livreur',
  description: 'Rejoignez SparkHub en tant que livreur et développez votre activité en Guadeloupe.',
}

export default async function InscriptionLivreurPage() {
  const supabase = await createClient()

  // Fetch communes for zone selection
  const { data: communes } = await supabase
    .from('communes')
    .select('id, name, zone')
    .order('zone')
    .order('name')

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="mb-6 flex justify-center">
        <TierCounter />
      </div>

      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Devenir Livreur</CardTitle>
          <CardDescription>
            Inscrivez-vous en quelques minutes et commencez à recevoir des demandes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InscriptionLivreurForm communes={communes || []} />
        </CardContent>
        <CardFooter className="flex flex-col gap-4 text-center text-sm">
          <p className="text-muted-foreground">
            Déjà inscrit ?{' '}
            <Link href="/connexion" className="text-primary hover:underline font-medium">
              Se connecter
            </Link>
          </p>
          <p className="text-muted-foreground">
            Vous êtes professionnel ?{' '}
            <Link href="/inscription/professionnel" className="text-primary hover:underline font-medium">
              Inscription Pro
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
