'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, ArrowLeft, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const sectors = [
  'Restaurant / Restauration rapide',
  'Commerce alimentaire',
  'Commerce de détail',
  'E-commerce',
  'Pharmacie / Santé',
  'Fleuriste',
  'Boulangerie / Pâtisserie',
  'Autre',
]

const deliveryNeeds = [
  { value: 'food', label: 'Livraison de repas' },
  { value: 'packages', label: 'Colis / Paquets' },
  { value: 'documents', label: 'Documents' },
  { value: 'groceries', label: 'Courses / Alimentation' },
  { value: 'express', label: 'Livraisons express' },
  { value: 'scheduled', label: 'Livraisons planifiées' },
]

const inscriptionSchema = z.object({
  // Step 1: Contact
  full_name: z.string().min(2, 'Nom requis'),
  email: z.string().email('Email invalide'),
  phone: z.string().min(10, 'Numéro de téléphone invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  confirm_password: z.string(),

  // Step 2: Company
  company_name: z.string().min(2, 'Nom de l\'entreprise requis'),
  siret: z.string().optional(),
  address: z.string().optional(),

  // Step 3: Activity
  sector: z.string().min(1, 'Secteur requis'),
  description: z.string().optional(),
  delivery_needs: z.array(z.string()).min(1, 'Sélectionnez au moins un besoin'),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirm_password'],
})

type InscriptionFormData = z.infer<typeof inscriptionSchema>

const steps = [
  { title: 'Contact', description: 'Vos coordonnées' },
  { title: 'Entreprise', description: 'Votre société' },
  { title: 'Activité', description: 'Vos besoins de livraison' },
]

export function InscriptionProForm() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<InscriptionFormData>({
    resolver: zodResolver(inscriptionSchema),
    defaultValues: {
      delivery_needs: [],
    },
  })

  const selectedNeeds = watch('delivery_needs') || []

  async function validateStep() {
    let fieldsToValidate: (keyof InscriptionFormData)[] = []

    switch (currentStep) {
      case 0:
        fieldsToValidate = ['full_name', 'email', 'phone', 'password', 'confirm_password']
        break
      case 1:
        fieldsToValidate = ['company_name']
        break
      case 2:
        fieldsToValidate = ['sector', 'delivery_needs']
        break
    }

    return await trigger(fieldsToValidate)
  }

  async function nextStep() {
    const isValid = await validateStep()
    if (isValid && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  function prevStep() {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  function toggleNeed(need: string) {
    const current = selectedNeeds
    if (current.includes(need)) {
      setValue('delivery_needs', current.filter((n) => n !== need))
    } else {
      setValue('delivery_needs', [...current, need])
    }
  }

  async function onSubmit(data: InscriptionFormData) {
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          full_name: data.full_name,
          phone: data.phone,
          role: 'professionnel',
          company_name: data.company_name,
          siret: data.siret,
          address: data.address,
          sector: data.sector,
          description: data.description,
          delivery_needs: data.delivery_needs,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Une erreur est survenue')
        return
      }

      toast.success(result.message || 'Inscription réussie !')
      router.push('/connexion?message=check-email')
    } catch (error) {
      console.error('Registration error:', error)
      toast.error('Une erreur est survenue')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium">{steps[currentStep].title}</span>
          <span className="text-muted-foreground">
            Étape {currentStep + 1} sur {steps.length}
          </span>
        </div>
        <Progress value={((currentStep + 1) / steps.length) * 100} />
        <p className="text-sm text-muted-foreground">{steps[currentStep].description}</p>
      </div>

      {/* Step 1: Contact */}
      {currentStep === 0 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nom complet *</Label>
            <Input
              id="full_name"
              placeholder="Jean Dupont"
              {...register('full_name')}
            />
            {errors.full_name && (
              <p className="text-sm text-destructive">{errors.full_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email professionnel *</Label>
            <Input
              id="email"
              type="email"
              placeholder="contact@entreprise.com"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone *</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="0590 00 00 00"
              {...register('phone')}
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe *</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm_password">Confirmer le mot de passe *</Label>
            <Input
              id="confirm_password"
              type="password"
              placeholder="••••••••"
              {...register('confirm_password')}
            />
            {errors.confirm_password && (
              <p className="text-sm text-destructive">{errors.confirm_password.message}</p>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Company */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company_name">Nom de l'entreprise *</Label>
            <Input
              id="company_name"
              placeholder="Ma Société SARL"
              {...register('company_name')}
            />
            {errors.company_name && (
              <p className="text-sm text-destructive">{errors.company_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="siret">Numéro SIRET (optionnel)</Label>
            <Input
              id="siret"
              placeholder="123 456 789 00012"
              {...register('siret')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adresse de l'établissement</Label>
            <Input
              id="address"
              placeholder="123 Rue Example, 97100 Basse-Terre"
              {...register('address')}
            />
          </div>
        </div>
      )}

      {/* Step 3: Activity */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Secteur d'activité *</Label>
            <Select onValueChange={(value) => setValue('sector', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez votre secteur" />
              </SelectTrigger>
              <SelectContent>
                {sectors.map((sector) => (
                  <SelectItem key={sector} value={sector}>
                    {sector}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.sector && (
              <p className="text-sm text-destructive">{errors.sector.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description de votre activité</Label>
            <Textarea
              id="description"
              placeholder="Décrivez brièvement votre activité..."
              rows={3}
              {...register('description')}
            />
          </div>

          <div className="space-y-2">
            <Label>Types de livraisons recherchées *</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Sélectionnez les types de livraison dont vous avez besoin
            </p>

            <div className="grid grid-cols-2 gap-2">
              {deliveryNeeds.map((need) => {
                const isSelected = selectedNeeds.includes(need.value)
                return (
                  <button
                    key={need.value}
                    type="button"
                    onClick={() => toggleNeed(need.value)}
                    className={cn(
                      'flex items-center justify-center rounded-lg border px-3 py-2 text-sm transition-colors',
                      isSelected
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-muted hover:bg-muted'
                    )}
                  >
                    {need.label}
                  </button>
                )
              })}
            </div>
            {errors.delivery_needs && (
              <p className="text-sm text-destructive">{errors.delivery_needs.message}</p>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 0 || isLoading}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Précédent
        </Button>

        {currentStep < steps.length - 1 ? (
          <Button type="button" onClick={nextStep}>
            Suivant
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            S'inscrire
          </Button>
        )}
      </div>
    </form>
  )
}
