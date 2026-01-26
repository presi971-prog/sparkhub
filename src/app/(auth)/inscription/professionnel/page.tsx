import { Metadata } from 'next'
import Link from 'next/link'
import { InscriptionProForm } from '@/components/forms/inscription-pro-form'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Inscription Professionnel',
  description: 'Inscrivez-vous en tant que professionnel sur SparkHub et trouvez des livreurs fiables.',
}

export default function InscriptionProPage() {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Espace Professionnel</CardTitle>
          <CardDescription>
            Trouvez des livreurs fiables et vérifiés pour votre activité
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InscriptionProForm />
        </CardContent>
        <CardFooter className="flex flex-col gap-4 text-center text-sm">
          <p className="text-muted-foreground">
            Déjà inscrit ?{' '}
            <Link href="/connexion" className="text-primary hover:underline font-medium">
              Se connecter
            </Link>
          </p>
          <p className="text-muted-foreground">
            Vous êtes livreur ?{' '}
            <Link href="/inscription/livreur" className="text-primary hover:underline font-medium">
              Inscription Livreur
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
