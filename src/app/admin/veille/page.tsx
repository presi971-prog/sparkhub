import { Metadata } from 'next'
import { VeilleDashboard } from './components/VeilleDashboard'

export const metadata: Metadata = {
  title: 'Veille RS',
  description: 'Veille concurrentielle - Posts et publicites a succes',
}

export default function AdminVeillePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Veille RS</h1>
        <p className="mt-2 text-muted-foreground">
          Posts et publicites a succes dans les thematiques Cobeone. Selectionnez ceux qui vous inspirent.
        </p>
      </div>
      <VeilleDashboard />
    </div>
  )
}
