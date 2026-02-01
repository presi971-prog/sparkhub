'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Upload, Loader2, Video, Coins, AlertCircle, Package } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { toast } from 'sonner'

const CREDITS_COST = 25
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const STYLES = [
  { value: 'Lifestyle', label: 'Lifestyle', description: 'Ambiance décontractée' },
  { value: 'Corporate', label: 'Corporate', description: 'Professionnel, bureau' },
  { value: 'Dynamic', label: 'Dynamique', description: 'Énergique, moderne' },
  { value: 'Festive', label: 'Festif', description: 'Ambiance festive' },
]

const DURATIONS = [
  { value: '5s', label: '5 secondes' },
  { value: '8s', label: '8 secondes' },
]

interface PromoProduitFormProps {
  userId: string
  credits: number
}

export function PromoProduitForm({ userId, credits }: PromoProduitFormProps) {
  const [imageUrl, setImageUrl] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [style, setStyle] = useState('')
  const [duration, setDuration] = useState('5s')
  const [productDescription, setProductDescription] = useState('')
  const [characterDescription, setCharacterDescription] = useState('')
  const [locationDescription, setLocationDescription] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'processing' | 'done'>('idle')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image trop volumineuse (max 10 Mo)')
      return
    }

    setIsUploading(true)

    try {
      const fileName = `${userId}/${Date.now()}-${file.name}`
      const { data, error } = await supabase.storage
        .from('images')
        .upload(fileName, file, { upsert: true })

      if (error) throw error

      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(data.path)

      setImageUrl(urlData.publicUrl)
      setImagePreview(URL.createObjectURL(file))
      toast.success('Image uploadée')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Erreur lors de l\'upload')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!imageUrl) {
      toast.error('Veuillez uploader la photo de votre produit')
      return
    }

    if (!style) {
      toast.error('Veuillez sélectionner un style')
      return
    }

    if (!characterDescription.trim()) {
      toast.error('Veuillez décrire le personnage souhaité')
      return
    }

    if (credits < CREDITS_COST) {
      toast.error(`Crédits insuffisants. ${CREDITS_COST} crédits requis.`)
      return
    }

    setIsGenerating(true)
    setGenerationStatus('processing')

    try {
      const response = await fetch('/api/video/promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          style,
          duration,
          productDescription,
          characterDescription,
          locationDescription
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la génération')
      }

      toast.success('Génération lancée ! Vous serez notifié quand la vidéo sera prête.')

      // Polling pour vérifier le statut
      pollVideoStatus()
    } catch (error) {
      console.error('Generation error:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la génération')
      setGenerationStatus('idle')
    } finally {
      setIsGenerating(false)
    }
  }

  const pollVideoStatus = async () => {
    const maxAttempts = 60 // 5 minutes max
    let attempts = 0

    const checkStatus = async () => {
      try {
        const response = await fetch('/api/video/status?tool=promo_produit')
        const data = await response.json()

        if (data.status === 'completed' && data.video?.url) {
          setVideoUrl(data.video.url)
          setGenerationStatus('done')
          toast.success('Votre vidéo est prête !')
          return
        }

        attempts++
        if (attempts < maxAttempts && data.status !== 'error') {
          setTimeout(checkStatus, 5000) // Vérifier toutes les 5 secondes
        } else if (data.status === 'error') {
          setGenerationStatus('idle')
          toast.error('Erreur lors de la génération')
        }
      } catch (error) {
        console.error('Status check error:', error)
      }
    }

    checkStatus()
  }

  const canSubmit = imageUrl && style && characterDescription.trim() && credits >= CREDITS_COST && !isGenerating

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Crédits disponibles */}
      <Card className="border-orange-500/20 bg-orange-500/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-orange-500" />
              <span className="font-medium">Crédits disponibles</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold">{credits}</span>
              <p className="text-sm text-muted-foreground">
                Coût: {CREDITS_COST} crédits
              </p>
            </div>
          </div>
          {credits < CREDITS_COST && (
            <div className="mt-4 flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Crédits insuffisants</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload produit */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5" />
            Photo du produit
          </CardTitle>
          <CardDescription>
            Uploadez une photo de votre produit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          {imagePreview ? (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Aperçu produit"
                className="w-full max-w-xs mx-auto rounded-lg border"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4 w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Upload en cours...
                  </>
                ) : (
                  'Changer la photo'
                )}
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full h-40 border-dashed"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" />
                  Upload en cours...
                </>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span>Cliquez pour uploader</span>
                  <span className="text-xs text-muted-foreground">PNG, JPG (max 10 Mo)</span>
                </div>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Description produit (optionnel) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Description du produit (optionnel)</CardTitle>
          <CardDescription>
            Décrivez votre produit pour améliorer le script
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Ex: Application mobile de livraison, interface moderne..."
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
            maxLength={200}
            rows={2}
          />
          <p className="text-xs text-muted-foreground mt-2">
            {productDescription.length}/200 caractères
          </p>
        </CardContent>
      </Card>

      {/* Description personnage (requis) */}
      <Card className="border-orange-500/30">
        <CardHeader>
          <CardTitle className="text-lg">Description du personnage *</CardTitle>
          <CardDescription>
            Décrivez le personnage qui présentera votre produit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Ex: Une femme antillaise de 30 ans, souriante, en tenue professionnelle..."
            value={characterDescription}
            onChange={(e) => setCharacterDescription(e.target.value)}
            maxLength={300}
            rows={3}
            required
          />
          <p className="text-xs text-muted-foreground mt-2">
            {characterDescription.length}/300 caractères - Soyez précis pour un meilleur résultat
          </p>
        </CardContent>
      </Card>

      {/* Description lieu (optionnel) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lieu / Décor (optionnel)</CardTitle>
          <CardDescription>
            Décrivez le décor souhaité
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Ex: Un bureau moderne avec vue sur la ville..."
            value={locationDescription}
            onChange={(e) => setLocationDescription(e.target.value)}
            maxLength={200}
            rows={2}
          />
          <p className="text-xs text-muted-foreground mt-2">
            {locationDescription.length}/200 caractères
          </p>
        </CardContent>
      </Card>

      {/* Style */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Style de la vidéo</CardTitle>
          <CardDescription>
            Choisissez l'ambiance de votre vidéo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {STYLES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setStyle(s.value)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  style === s.value
                    ? 'border-orange-500 bg-orange-500/10 ring-2 ring-orange-500/20'
                    : 'border-border hover:border-orange-500/50'
                }`}
              >
                <div className="font-medium">{s.label}</div>
                <div className="text-sm text-muted-foreground">{s.description}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Durée */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Durée</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATIONS.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Résultat vidéo */}
      {generationStatus !== 'idle' && (
        <Card className="border-orange-500">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Video className="h-5 w-5" />
              Votre vidéo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {generationStatus === 'processing' ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
                <div className="text-center">
                  <p className="font-medium">Génération en cours...</p>
                  <p className="text-sm text-muted-foreground">
                    Cela peut prendre quelques minutes
                  </p>
                </div>
              </div>
            ) : videoUrl ? (
              <video
                src={videoUrl}
                controls
                className="w-full rounded-lg"
                autoPlay
                loop
              />
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Bouton submit */}
      <Button
        type="submit"
        size="lg"
        className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
        disabled={!canSubmit}
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Génération en cours...
          </>
        ) : (
          <>
            <Video className="h-5 w-5" />
            Générer ma vidéo ({CREDITS_COST} crédits)
          </>
        )}
      </Button>
    </form>
  )
}
