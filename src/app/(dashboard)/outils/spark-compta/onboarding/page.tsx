import { Metadata } from 'next'
import OnboardingWizard from '@/components/spark-compta/onboarding/OnboardingWizard'

export const metadata: Metadata = {
  title: 'Spark Compta — Onboarding',
  description: 'Configure ton compte Spark Compta en 5 étapes rapides.',
}

export default function SparkComptaOnboardingPage() {
  return (
    <div className="py-6 sm:py-10">
      <OnboardingWizard />
    </div>
  )
}
