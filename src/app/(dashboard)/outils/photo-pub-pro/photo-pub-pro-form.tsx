'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Loader2, Coins, AlertCircle, Download, RefreshCw,
  Sparkles, ChevronDown, ChevronUp, X, ZoomIn,
} from 'lucide-react'
import { toast } from 'sonner'
import { TOOLS_CONFIG } from '@/config/tiers'

const POLL_INTERVAL = 3000
const MAX_POLLS = 80

// ═══════════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════════

const CATEGORIES = [
  { id: 'portrait_pro', label: 'Portrait Pro', emoji: '📸' },
  { id: 'produit', label: 'Photo Produit', emoji: '🛍️' },
  { id: 'food', label: 'Food & Restaurant', emoji: '🍽️' },
  { id: 'immobilier', label: 'Immobilier & Déco', emoji: '🏠' },
  { id: 'lifestyle', label: 'Lifestyle & Mode', emoji: '✨' },
  { id: 'commerce', label: 'Mon Commerce', emoji: '🏪' },
  { id: 'evenement', label: 'Événement & Promo', emoji: '🎉' },
  { id: 'tropical', label: 'Tropical & Caraïbes', emoji: '🌴' },
]

const FORMATS = [
  { id: 'square', label: 'Carré 1:1' },
  { id: 'portrait', label: 'Portrait 4:5' },
  { id: 'landscape', label: 'Paysage 16:9' },
  { id: 'story', label: 'Story 9:16' },
]

const PRICING: Record<string, Record<number, number>> = {
  standard: { 1: TOOLS_CONFIG.photo_standard_1.credits, 4: TOOLS_CONFIG.photo_standard_4.credits },
  '4k_pro': { 1: TOOLS_CONFIG.photo_4k_1.credits, 4: TOOLS_CONFIG.photo_4k_4.credits },
}

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type Step = 'form' | 'generating' | 'result'

interface PhotoJob {
  variant: number
  prompt: string
  status_url: string | null
  response_url: string | null
  error: string | null
  image_url?: string
  status: 'pending' | 'processing' | 'completed' | 'error'
}

interface StudioPhotoFormProps {
  userId: string
  credits: number
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function StudioPhotoForm({ credits: initialCredits }: StudioPhotoFormProps) {
  // Form state
  const [category, setCategory] = useState('portrait_pro')
  const [description, setDescription] = useState('')
  const [format, setFormat] = useState('square')
  const [quality, setQuality] = useState('standard')
  const [variants, setVariants] = useState<1 | 4>(1)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [advSubject, setAdvSubject] = useState('')
  const [advAction, setAdvAction] = useState('')
  const [advLocation, setAdvLocation] = useState('')
  const [advLighting, setAdvLighting] = useState('')
  const [advPhotoStyle, setAdvPhotoStyle] = useState('')
  const [advDetails, setAdvDetails] = useState('')
  const [advAmbiance, setAdvAmbiance] = useState('')

  // Credits
  const [credits, setCredits] = useState(initialCredits)
  const creditsCost = PRICING[quality]?.[variants] || 3

  // Generation state
  const [step, setStep] = useState<Step>('form')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [photoJobs, setPhotoJobs] = useState<PhotoJob[]>([])
  const [creditsRemaining, setCreditsRemaining] = useState(0)
  const pollRefs = useRef<NodeJS.Timeout[]>([])

  // Lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      pollRefs.current.forEach(t => clearTimeout(t))
    }
  }, [])

  // Poll a single photo job
  const pollPhotoJob = useCallback(async (index: number, statusUrl: string, responseUrl: string, attempt = 0) => {
    if (attempt >= MAX_POLLS) {
      setPhotoJobs(prev => {
        const updated = [...prev]
        updated[index] = { ...updated[index], status: 'error', error: 'Timeout' }
        return updated
      })
      return
    }

    try {
      const params = new URLSearchParams({ statusUrl, responseUrl })
      const response = await fetch(`/api/photo/status?${params}`)
      const data = await response.json()

      if (data.status === 'completed' && data.image_url) {
        setPhotoJobs(prev => {
          const updated = [...prev]
          updated[index] = { ...updated[index], status: 'completed', image_url: data.image_url }
          return updated
        })
        return
      }

      if (data.status === 'error') {
        setPhotoJobs(prev => {
          const updated = [...prev]
          updated[index] = { ...updated[index], status: 'error', error: data.error }
          return updated
        })
        return
      }

      const timeout = setTimeout(() => pollPhotoJob(index, statusUrl, responseUrl, attempt + 1), POLL_INTERVAL)
      pollRefs.current[index] = timeout
    } catch {
      setPhotoJobs(prev => {
        const updated = [...prev]
        updated[index] = { ...updated[index], status: 'error', error: 'Erreur réseau' }
        return updated
      })
    }
  }, [])

  // Check completion
  const allDone = photoJobs.length > 0 && photoJobs.every(j => j.status === 'completed' || j.status === 'error')
  const completedPhotos = photoJobs.filter(j => j.status === 'completed')

  // Auto-transition
  useEffect(() => {
    if (allDone && step === 'generating') {
      if (completedPhotos.length > 0) {
        setStep('result')
        toast.success(`${completedPhotos.length} photo${completedPhotos.length > 1 ? 's' : ''} générée${completedPhotos.length > 1 ? 's' : ''} !`)
      } else {
        toast.error('Aucune photo n\'a pu être générée. Réessayez.')
        setStep('form')
      }
    }
  }, [allDone, step, completedPhotos.length])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!description.trim()) {
      toast.error('Décris ta photo idéale')
      return
    }

    if (credits < creditsCost) {
      toast.error(`Crédits insuffisants. ${creditsCost} crédits requis.`)
      return
    }

    setIsSubmitting(true)
    setStep('generating')

    try {
      const advancedFields = showAdvanced ? {
        subject: advSubject.trim() || undefined,
        action: advAction.trim() || undefined,
        location: advLocation.trim() || undefined,
        lighting: advLighting.trim() || undefined,
        photoStyle: advPhotoStyle.trim() || undefined,
        details: advDetails.trim() || undefined,
        ambiance: advAmbiance.trim() || undefined,
      } : undefined

      const response = await fetch('/api/photo/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          description: description.trim(),
          format,
          quality,
          variants,
          advancedFields,
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la génération')
      }

      const r = data.result
      setCredits(r.credits_remaining)
      setCreditsRemaining(r.credits_remaining)

      // Initialiser les jobs
      const jobs: PhotoJob[] = r.photos.map((photo: PhotoJob) => ({
        ...photo,
        status: photo.error ? 'error' as const : 'processing' as const,
      }))
      setPhotoJobs(jobs)

      // Lancer le polling
      jobs.forEach((job: PhotoJob, index: number) => {
        if (job.status_url && job.response_url) {
          pollPhotoJob(index, job.status_url, job.response_url)
        }
      })
    } catch (error) {
      console.error('Generation error:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la génération')
      setStep('form')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    pollRefs.current.forEach(t => clearTimeout(t))
    pollRefs.current = []
    setStep('form')
    setPhotoJobs([])
    setDescription('')
    setShowAdvanced(false)
    setAdvSubject('')
    setAdvAction('')
    setAdvLocation('')
    setAdvLighting('')
    setAdvPhotoStyle('')
    setAdvDetails('')
    setAdvAmbiance('')
  }

  const handleRegenerate = () => {
    pollRefs.current.forEach(t => clearTimeout(t))
    pollRefs.current = []
    setStep('form')
    setPhotoJobs([])
    // Garder les paramètres pour régénérer
  }

  // ============== LIGHTBOX ==============
  if (lightboxUrl) {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
        <button
          onClick={() => setLightboxUrl(null)}
          className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
        >
          <X className="h-8 w-8" />
        </button>
        <img
          src={lightboxUrl}
          alt="Photo agrandie"
          className="max-w-full max-h-full object-contain rounded-lg"
        />
        <div className="absolute bottom-6 flex gap-3">
          <a
            href={lightboxUrl}
            download="sparkhub-studio-photo.png"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-colors"
          >
            <Download className="h-4 w-4" />
            Télécharger
          </a>
        </div>
      </div>
    )
  }

  // ============== GENERATING ==============
  if (step === 'generating') {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              Génération en cours...
            </CardTitle>
            <CardDescription>
              L&apos;IA crée {variants === 4 ? '4 variantes' : 'ta photo'} hyperréaliste{variants === 4 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {variants === 4 ? (
              <div className="grid grid-cols-2 gap-4">
                {photoJobs.map((job, index) => (
                  <div
                    key={index}
                    className="aspect-square rounded-lg border overflow-hidden relative"
                  >
                    {job.status === 'completed' && job.image_url ? (
                      <img
                        src={job.image_url}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : job.status === 'error' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-red-500/5 text-red-500 p-4">
                        <AlertCircle className="h-8 w-8 mb-2" />
                        <span className="text-xs text-center">Échec</span>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-blue-500/5">
                        <div className="relative">
                          <div className="h-10 w-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                        </div>
                        <span className="text-xs text-muted-foreground mt-3">Photo {index + 1}</span>
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="aspect-square max-w-sm mx-auto rounded-lg border overflow-hidden relative">
                {photoJobs[0]?.status === 'completed' && photoJobs[0]?.image_url ? (
                  <img
                    src={photoJobs[0].image_url}
                    alt="Photo générée"
                    className="w-full h-full object-cover"
                  />
                ) : photoJobs[0]?.status === 'error' ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-red-500/5 text-red-500 p-4">
                    <AlertCircle className="h-8 w-8 mb-2" />
                    <span className="text-sm text-center">Échec de la génération</span>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-blue-500/5">
                    <div className="h-12 w-12 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                    <span className="text-sm text-muted-foreground mt-4">Création de ta photo...</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
                  </div>
                )}
              </div>
            )}
            <p className="text-center text-sm text-muted-foreground mt-4">
              {completedPhotos.length}/{photoJobs.length} photo{photoJobs.length > 1 ? 's' : ''} prête{completedPhotos.length > 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ============== RESULT ==============
  if (step === 'result') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center gap-2 text-green-500">
          <Sparkles className="h-5 w-5" />
          <span className="font-medium">
            {completedPhotos.length === 1 ? 'Photo générée !' : `${completedPhotos.length} photos générées !`}
          </span>
        </div>

        {/* 1 photo = image large */}
        {variants === 1 && completedPhotos[0]?.image_url && (
          <Card>
            <CardContent className="pt-6">
              <img
                src={completedPhotos[0].image_url}
                alt="Photo générée"
                className="w-full rounded-lg cursor-pointer hover:opacity-95 transition-opacity"
                onClick={() => setLightboxUrl(completedPhotos[0].image_url!)}
              />
            </CardContent>
          </Card>
        )}

        {/* 4 photos = grille 2x2 */}
        {variants === 4 && (
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-3">
                {photoJobs.map((job, index) => {
                  if (job.status !== 'completed' || !job.image_url) return null
                  return (
                    <div key={index} className="relative group">
                      <img
                        src={job.image_url}
                        alt={`Photo ${index + 1}`}
                        className="w-full aspect-square object-cover rounded-lg cursor-pointer hover:opacity-95 transition-opacity"
                        onClick={() => setLightboxUrl(job.image_url!)}
                      />
                      <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <a
                        href={job.image_url}
                        download={`sparkhub-photo-${index + 1}.png`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute bottom-2 right-2 p-1.5 bg-black/60 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Boutons d'action */}
        <div className="grid grid-cols-2 gap-3">
          {variants === 1 && completedPhotos[0]?.image_url && (
            <a
              href={completedPhotos[0].image_url}
              download="sparkhub-studio-photo.png"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
            >
              <Download className="h-5 w-5" />
              Télécharger
            </a>
          )}

          <Button
            variant="outline"
            onClick={handleRegenerate}
            className={`flex items-center gap-2 ${variants === 4 ? 'col-span-2' : ''}`}
          >
            <Sparkles className="h-5 w-5" />
            Régénérer
          </Button>
        </div>

        <Button
          variant="ghost"
          onClick={handleReset}
          className="w-full flex items-center gap-2"
        >
          <RefreshCw className="h-5 w-5" />
          Nouvelle photo
        </Button>

        {/* Info crédits */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Crédits utilisés</span>
              <span className="font-medium">{creditsCost}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-muted-foreground">Solde restant</span>
              <span className="font-medium text-primary">{creditsRemaining}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ============== FORM ==============
  const canSubmit = description.trim() && credits >= creditsCost && !isSubmitting

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Card crédits */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-blue-500" />
              <span className="font-medium">Crédits disponibles</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold">{credits}</span>
              <p className="text-sm text-muted-foreground">
                Coût: {creditsCost} crédits
              </p>
            </div>
          </div>
          {credits < creditsCost && (
            <div className="mt-4 flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Crédits insuffisants</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 1. Catégorie */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">1. Catégorie</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  category === cat.id
                    ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20'
                    : 'border-border hover:border-blue-500/50'
                }`}
              >
                <span className="text-lg mr-2">{cat.emoji}</span>
                <span className="font-medium text-sm">{cat.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 2. Description */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">2. Décris ta photo idéale *</CardTitle>
          <CardDescription>
            Sois le plus précis possible pour un résultat bluffant
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Textarea
              placeholder="Ex: Un bokit garni sur une table en bois rustique, vue mer en arrière-plan, lumière dorée du coucher de soleil..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">{description.length}/500</p>
          </div>

          {/* Toggle mode avancé */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-600 transition-colors"
          >
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {showAdvanced ? 'Masquer les détails' : 'Affiner les détails (optionnel)'}
          </button>

          {/* Champs avancés */}
          {showAdvanced && (
            <div className="space-y-3 pt-2 border-t">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Sujet (qui/quoi)</label>
                <Input
                  placeholder="Femme 30 ans, chef cuisinier"
                  value={advSubject}
                  onChange={(e) => setAdvSubject(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Action</label>
                <Input
                  placeholder="Prépare un plat, souriante"
                  value={advAction}
                  onChange={(e) => setAdvAction(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Lieu</label>
                <Input
                  placeholder="Cuisine ouverte, comptoir marbre"
                  value={advLocation}
                  onChange={(e) => setAdvLocation(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Éclairage</label>
                <Input
                  placeholder="Lumière chaude, fenêtre latérale"
                  value={advLighting}
                  onChange={(e) => setAdvLighting(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Style photo</label>
                <Input
                  placeholder="Éditorial, magazine culinaire"
                  value={advPhotoStyle}
                  onChange={(e) => setAdvPhotoStyle(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Détails / textures</label>
                <Input
                  placeholder="Vapeur, ingrédients frais, tablier taché"
                  value={advDetails}
                  onChange={(e) => setAdvDetails(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Ambiance</label>
                <Input
                  placeholder="Chaleureuse, passionnée, authentique"
                  value={advAmbiance}
                  onChange={(e) => setAdvAmbiance(e.target.value)}
                  maxLength={100}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Format */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">3. Format</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {FORMATS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFormat(f.id)}
                className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                  format === f.id
                    ? 'border-blue-500 bg-blue-500/10 text-blue-500'
                    : 'border-border hover:border-blue-500/50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 4. Qualité */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">4. Qualité</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setQuality('standard')}
              className={`p-4 rounded-lg border text-left transition-all ${
                quality === 'standard'
                  ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20'
                  : 'border-border hover:border-blue-500/50'
              }`}
            >
              <div className="font-medium">Standard</div>
              <div className="text-xs text-muted-foreground mt-1">Bonne qualité, rapide</div>
              <div className="text-sm font-medium text-blue-500 mt-2">
                {PRICING.standard[variants]} crédits
              </div>
            </button>
            <button
              type="button"
              onClick={() => setQuality('4k_pro')}
              className={`p-4 rounded-lg border text-left transition-all relative ${
                quality === '4k_pro'
                  ? 'border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/20'
                  : 'border-border hover:border-purple-500/50'
              }`}
            >
              <div className="absolute -top-2 -right-2 bg-purple-500 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                PRO
              </div>
              <div className="font-medium">4K Pro</div>
              <div className="text-xs text-muted-foreground mt-1">Ultra détaillé, pro</div>
              <div className="text-sm font-medium text-purple-500 mt-2">
                {PRICING['4k_pro'][variants]} crédits
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* 5. Variantes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">5. Nombre de photos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setVariants(1)}
              className={`p-4 rounded-lg border text-center transition-all ${
                variants === 1
                  ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20'
                  : 'border-border hover:border-blue-500/50'
              }`}
            >
              <div className="text-2xl font-bold">1</div>
              <div className="text-sm text-muted-foreground">photo</div>
              <div className="text-sm font-medium text-blue-500 mt-1">
                {PRICING[quality][1]} cr.
              </div>
            </button>
            <button
              type="button"
              onClick={() => setVariants(4)}
              className={`p-4 rounded-lg border text-center transition-all ${
                variants === 4
                  ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20'
                  : 'border-border hover:border-blue-500/50'
              }`}
            >
              <div className="text-2xl font-bold">4</div>
              <div className="text-sm text-muted-foreground">photos</div>
              <div className="text-sm font-medium text-blue-500 mt-1">
                {PRICING[quality][4]} cr.
              </div>
            </button>
          </div>
          {variants === 4 && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              4 variantes radicalement différentes (angles, éclairages, ambiances)
            </p>
          )}
        </CardContent>
      </Card>

      {/* Bouton submit */}
      <Button
        type="submit"
        size="lg"
        className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
        disabled={!canSubmit}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Génération en cours...
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5" />
            Générer ({creditsCost} crédits)
          </>
        )}
      </Button>
    </form>
  )
}
