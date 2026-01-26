import { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { LoginForm } from '@/components/forms/login-form'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Connexion',
  description: 'Connectez-vous à votre compte Cobeone Pro.',
}

function LoginFormFallback() {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )
}

export default function ConnexionPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Bon retour !</CardTitle>
        <CardDescription>
          Connectez-vous à votre compte Cobeone Pro
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<LoginFormFallback />}>
          <LoginForm />
        </Suspense>
      </CardContent>
      <CardFooter className="flex flex-col gap-4 text-center text-sm">
        <p className="text-muted-foreground">
          Pas encore de compte ?{' '}
          <Link href="/inscription/livreur" className="text-primary hover:underline font-medium">
            Devenir Livreur
          </Link>
          {' '}ou{' '}
          <Link href="/inscription/professionnel" className="text-primary hover:underline font-medium">
            Professionnel
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
