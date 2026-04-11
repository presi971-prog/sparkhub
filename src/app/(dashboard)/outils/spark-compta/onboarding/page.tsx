import { Metadata } from 'next'
import { Card, CardContent } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Spark Compta — Onboarding',
}

/**
 * Onboarding Spark Compta — placeholder Phase 2.A
 *
 * À développer en Phase 3 Sprint 1 (semaine 2 du plan de build) :
 * - Étape 0 : démo visuelle avec données fictives
 * - Étape 1 : choix famille métier (6 options)
 * - Étape 2 : localisation fiscale + régime fiscal
 * - Étape 3 : mode simple / comptable
 * - Étape 4 : connexion WhatsApp (lien magique)
 * - Étape 5 : premier log de démonstration
 */
export default function SparkComptaOnboardingPage() {
  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Onboarding Spark Compta</h1>
        <p className="text-muted-foreground mt-1">
          Wizard en 5 étapes — à construire en Phase 3 Sprint 1
        </p>
      </div>

      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            🚧 Placeholder — à développer lors du Sprint 1 de la Phase 3.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
