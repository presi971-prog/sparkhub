import { Metadata } from 'next'
import { Card, CardContent } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Spark Compta — Dashboard',
}

/**
 * Dashboard Spark Compta — placeholder Phase 2.A
 *
 * À développer en Phase 3 Sprint 3 (semaine 4 du plan de build) :
 * - Bloc 1 : 3 chiffres clés (net / recettes / dépenses)
 * - Bloc 2 : graphique 6 mois
 * - Bloc 3 : top 3 dépenses
 * - Bloc 4 : alertes IA contextualisées
 * - Bloc 5 : adapté au métier (varie selon la famille)
 * - Bloc 6 : enveloppe + boutons d'action (export, paramètres)
 *
 * Temps réel via Supabase Realtime (websockets)
 */
export default function SparkComptaDashboardPage() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Dashboard Spark Compta</h1>
        <p className="text-muted-foreground mt-1">
          Tes chiffres en temps réel — à construire en Phase 3 Sprint 3
        </p>
      </div>

      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            🚧 Placeholder — les 6 blocs du dashboard seront construits lors du Sprint 3.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
