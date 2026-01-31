import {
  HeroSection,
  HowItWorksSection,
  FoundersSection,
  FeaturesSection,
  TestimonialsSection,
  CTASection
} from '@/components/landing'

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
