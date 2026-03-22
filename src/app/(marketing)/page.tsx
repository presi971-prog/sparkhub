import dynamic from 'next/dynamic'
import { HeroSection } from '@/components/landing'

// Lazy-load les sections below-the-fold pour accélérer le premier affichage
const HowItWorksSection = dynamic(() => import('@/components/landing/how-it-works-section').then(m => ({ default: m.HowItWorksSection })))
const FoundersSection = dynamic(() => import('@/components/landing/founders-section').then(m => ({ default: m.FoundersSection })))
const FeaturesSection = dynamic(() => import('@/components/landing/features-section').then(m => ({ default: m.FeaturesSection })))
const TestimonialsSection = dynamic(() => import('@/components/landing/testimonials-section').then(m => ({ default: m.TestimonialsSection })))
const CTASection = dynamic(() => import('@/components/landing/cta-section').then(m => ({ default: m.CTASection })))

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <HeroSection />
      <HowItWorksSection />
      <FoundersSection />
      <FeaturesSection />
      <TestimonialsSection />
      <CTASection />
    </div>
  )
}
