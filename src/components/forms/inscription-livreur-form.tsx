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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Progress } from '@/components/ui/progress'
import { Loader2, ArrowLeft, ArrowRight, Check, Bike, Car, Truck } from 'lucide-react'
import { cn } from '@/lib/utils'

const vehicleTypes = [
  { value: 'velo', label: 'Vélo', icon: Bike },
  { value: 'velo_cargo', label: 'Vélo Cargo', icon: Bike },
  { value: 'scooter', label: 'Scooter', icon: Bike },
  { value: 'moto', label: 'Moto', icon: Bike },
  { value: 'voiture', label: 'Voiture', icon: Car },
  { value: 'utilitaire', label: 'Utilitaire', icon: Truck },
] as const

const inscriptionSchema = z.object({
  // Step 1: Identity
  full_name: z.string().min(2, 'Nom requis'),
  email: z.string().email('Email invalide'),
  phone: z.string().min(10, 'Numéro de téléphone invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  confirm_password: z.string(),

  // Step 2: Vehicle
  vehicle_type: z.enum(['velo', 'velo_cargo', 'scooter', 'moto', 'voiture', 'utilitaire']),
  vehicle_brand: z.string().optional(),
  vehicle_model: z.string().optional(),
  license_plate: z.string().optional(),

  // Step 3: Documents
  siret: z.string().optional(),
  has_permit: z.boolean().default(false),
  has_insurance: z.boolean().default(false),

  // Step 4: Zones
  zones: z.array(z.string()).min(1, 'Sélectionnez au moins une zone'),
  primary_zone: z.string().optional(),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirm_password'],
})

type InscriptionFormData = z.infer<typeof inscriptionSchema>

interface Commune {
  id: string
  name: string
  zone: string
}

interface Props {
  communes: Commune[]
}

const steps = [
  { title: 'Identité', description: 'Vos informations personnelles' },
  { title: 'Véhicule', description: 'Votre moyen de transport' },
  { title: 'Documents', description: 'Vos justificatifs' },
  { title: 'Zones', description: 'Vos zones de livraison' },
]

export function InscriptionLivreurForm({ communes }: Props) {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(inscriptionSchema) as any,
    defaultValues: {
      zones: [],
      has_permit: false,
      has_insurance: false,
    },
  })

  const selectedVehicle = watch('vehicle_type')
  const selectedZones = watch('zones') || []

  // Group communes by zone
  const communesByZone = communes.reduce((acc, commune) => {
    if (!acc[commune.zone]) acc[commune.zone] = []
    acc[commune.zone].push(commune)
    return acc
  }, {} as Record<string, Commune[]>)

  const zoneLabels: Record<string, string> = {
    basse_terre: 'Basse-Terre',
    grande_terre: 'Grande-Terre',
    marie_galante: 'Marie-Galante',
    les_saintes: 'Les Saintes',
    la_desirade: 'La Désirade',
  }

  async function validateStep() {
    let fieldsToValidate: (keyof InscriptionFormData)[] = []

    switch (currentStep) {
      case 0:
        fieldsToValidate = ['full_name', 'email', 'phone', 'password', 'confirm_password']
        break
      case 1:
        fieldsToValidate = ['vehicle_type']
        break
      case 2:
        // No required fields in step 3
        break
      case 3:
        fieldsToValidate = ['zones']
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
          role: 'livreur',
          vehicle_type: data.vehicle_type,
          vehicle_brand: data.vehicle_brand,
          vehicle_model: data.vehicle_model,
          license_plate: data.license_plate,
          siret: data.siret,
          has_permit: data.has_permit,
          has_insurance: data.has_insurance,
          zones: data.zones,
          primary_zone: data.primary_zone,
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

  function toggleZone(communeId: string) {
    const current = selectedZones
    if (current.includes(communeId)) {
      setValue('zones', current.filter((z) => z !== communeId))
    } else {
      setValue('zones', [...current, communeId])
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

      {/* Step 1: Identity */}
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
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="votre@email.com"
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
              placeholder="0690 00 00 00"
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

      {/* Step 2: Vehicle */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Type de véhicule *</Label>
            <RadioGroup
              value={selectedVehicle}
              onValueChange={(value) => setValue('vehicle_type', value as typeof vehicleTypes[number]['value'])}
              className="grid grid-cols-2 gap-4"
            >
              {vehicleTypes.map((vehicle) => (
                <div key={vehicle.value}>
                  <RadioGroupItem
                    value={vehicle.value}
                    id={vehicle.value}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={vehicle.value}
                    className={cn(
                      'flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors',
                      'peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5'
                    )}
                  >
                    <vehicle.icon className="h-8 w-8 mb-2" />
                    <span className="text-sm font-medium">{vehicle.label}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {errors.vehicle_type && (
              <p className="text-sm text-destructive">{errors.vehicle_type.message}</p>
            )}
          </div>

          {selectedVehicle && !['velo', 'velo_cargo'].includes(selectedVehicle) && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicle_brand">Marque</Label>
                  <Input
                    id="vehicle_brand"
                    placeholder="Peugeot"
                    {...register('vehicle_brand')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicle_model">Modèle</Label>
                  <Input
                    id="vehicle_model"
                    placeholder="Partner"
                    {...register('vehicle_model')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="license_plate">Immatriculation</Label>
                <Input
                  id="license_plate"
                  placeholder="AA-123-BB"
                  {...register('license_plate')}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 3: Documents */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="siret">Numéro SIRET (optionnel)</Label>
            <Input
              id="siret"
              placeholder="123 456 789 00012"
              {...register('siret')}
            />
            <p className="text-xs text-muted-foreground">
              Si vous êtes auto-entrepreneur ou avez une entreprise
            </p>
          </div>

          <div className="space-y-4 pt-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="has_permit"
                checked={watch('has_permit')}
                onCheckedChange={(checked) => setValue('has_permit', checked === true)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="has_permit" className="cursor-pointer">
                  J'ai un permis de conduire valide
                </Label>
                <p className="text-xs text-muted-foreground">
                  Requis pour les véhicules motorisés
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="has_insurance"
                checked={watch('has_insurance')}
                onCheckedChange={(checked) => setValue('has_insurance', checked === true)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="has_insurance" className="cursor-pointer">
                  J'ai une assurance responsabilité civile professionnelle
                </Label>
                <p className="text-xs text-muted-foreground">
                  Recommandé pour exercer en toute sécurité
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Zones */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Sélectionnez les communes où vous souhaitez effectuer des livraisons.
            Vous pourrez modifier ces zones plus tard.
          </p>

          {errors.zones && (
            <p className="text-sm text-destructive">{errors.zones.message}</p>
          )}

          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {Object.entries(communesByZone).map(([zone, zoneCommunes]) => (
              <div key={zone} className="space-y-2">
                <h4 className="font-medium text-sm sticky top-0 bg-background py-1">
                  {zoneLabels[zone] || zone}
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {zoneCommunes.map((commune) => {
                    const isSelected = selectedZones.includes(commune.id)
                    return (
                      <button
                        key={commune.id}
                        type="button"
                        onClick={() => toggleZone(commune.id)}
                        className={cn(
                          'flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors',
                          isSelected
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-muted hover:bg-muted'
                        )}
                      >
                        <span>{commune.name}</span>
                        {isSelected && <Check className="h-4 w-4" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <p className="text-sm text-muted-foreground">
            {selectedZones.length} commune{selectedZones.length > 1 ? 's' : ''} sélectionnée{selectedZones.length > 1 ? 's' : ''}
          </p>
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
