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
import { Upload, Loader2, Video, Coins, AlertCircle } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { toast } from 'sonner'

const CREDITS_COST = 25
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const STYLES = [
  { value: 'Lifestyle', label: 'Lifestyle', description: 'Casual, terrasse/café' },
  { value: 'Corporate', label: 'Corporate', description: 'Bureau moderne, professionnel' },
  { value: 'Dynamic', label: 'Dynamique', description: 'Sportswear, énergique' },
  { value: 'Festive', label: 'Festif', description: 'Soirée, ambiance chaude' },
]

const DURATIONS = [
  { value: '5s', label: '5 secondes' },
  { value: '8s', label: '8 secondes' },
]

interface AvatarVideoFormProps {
  userId: string
  credits: number
}

export function AvatarVideoForm({ userId, credits }: AvatarVideoFormProps) {
  const [imageUrl, setImageUrl] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [style, setStyle] = useState('')
  const [duration, setDuration] = useState('5s')
  const [message, setMessage] = useState('')
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
      toast.error('Veuillez uploader votre photo')
      return
    }

    if (!style) {
      toast.error('Veuillez sélectionner un style')
      return
    }

    if (credits < CREDITS_COST) {
      toast.error(`Crédits insuffisants. ${CREDITS_COST} crédits requis.`)
      return
    }

    setIsGenerating(true)
    setGenerationStatus('processing')

    try {
      const response = await fetch('/api/video/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          style,
          duration,
          message
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
        const response = await fetch('/api/video/status?tool=avatar_video')
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

  const canSubmit = imageUrl && style && credits >= CREDITS_COST && !isGenerating

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Crédits disponibles */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" />
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

      {/* Upload photo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Votre photo</CardTitle>
          <CardDescription>
            Uploadez une photo de vous (visage bien visible)
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
                alt="Aperçu"
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
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/50'
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

      {/* Message optionnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Message (optionnel)</CardTitle>
          <CardDescription>
            Le texte que votre avatar prononcera
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Ex: Salut ! Bienvenue sur ma page..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={150}
            rows={3}
          />
          <p className="text-xs text-muted-foreground mt-2">
            {message.length}/150 caractères
          </p>
        </CardContent>
      </Card>

      {/* Résultat vidéo */}
      {generationStatus !== 'idle' && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Video className="h-5 w-5" />
              Votre vidéo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {generationStatus === 'processing' ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
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
        className="w-full"
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
