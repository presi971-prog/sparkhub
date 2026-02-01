'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  Upload, Loader2, Camera, Coins, AlertCircle, Download, RefreshCw,
  ShoppingBag, User, Sun, Briefcase, Flame, PartyPopper, Sparkles
} from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { toast } from 'sonner'

const CREDITS_COST = 5
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const STYLES = [
  { id: 'lifestyle', label: 'Lifestyle', icon: Sun, desc: 'Tenue décontractée, terrasse' },
  { id: 'corporate', label: 'Corporate', icon: Briefcase, desc: 'Costume, bureau moderne' },
  { id: 'dynamic', label: 'Dynamique', icon: Flame, desc: 'Sportswear, énergie' },
  { id: 'festive', label: 'Festif', icon: PartyPopper, desc: 'Soirée, événement' },
]

const MODES = [
  { id: 'product', label: 'Avec mon Produit', icon: ShoppingBag, desc: 'Toi dans un nouveau contexte avec ton produit' },
  { id: 'profile', label: 'Nouveau Profil', icon: User, desc: 'Toi transformé en pro d\'un autre univers' },
]

interface PhotoPubProFormProps {
  userId: string
  credits: number
}

export function PhotoPubProForm({ userId, credits: initialCredits }: PhotoPubProFormProps) {
  const [imageUrl, setImageUrl] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [mode, setMode] = useState('product')
  const [style, setStyle] = useState('lifestyle')
  const [instructions, setInstructions] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<{ image_url: string; credits_remaining: number } | null>(null)
  const [credits, setCredits] = useState(initialCredits)
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

    if (credits < CREDITS_COST) {
      toast.error(`Crédits insuffisants. ${CREDITS_COST} crédits requis.`)
      return
    }

    setIsGenerating(true)

    try {
      const response = await fetch('/api/photo/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          mode,
          style,
          instructions
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la génération')
      }

      setResult(data.result)
      setCredits(data.result.credits_remaining)
      toast.success('Photo générée avec succès !')
    } catch (error) {
      console.error('Generation error:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la génération')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleReset = () => {
    setResult(null)
    setImageUrl('')
    setImagePreview(null)
    setInstructions('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleTryAnotherStyle = () => {
    const otherStyles = STYLES.filter(s => s.id !== style)
    const randomStyle = otherStyles[Math.floor(Math.random() * otherStyles.length)]
    setStyle(randomStyle.id)
    setResult(null)
  }

  const canSubmit = imageUrl && credits >= CREDITS_COST && !isGenerating

  // Affichage du résultat
  if (result) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center gap-2 text-green-500">
          <Sparkles className="h-5 w-5" />
          <span className="font-medium">Photo générée avec succès !</span>
        </div>

        <Card>
          <CardContent className="pt-6">
            <img
              src={result.image_url}
              alt="Photo générée"
              className="w-full rounded-lg"
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <a
            href={result.image_url}
            download="sparkhub-photo.png"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
          >
            <Download className="h-5 w-5" />
            Télécharger
          </a>

          <Button
            variant="outline"
            onClick={handleTryAnotherStyle}
            className="flex items-center gap-2"
          >
            <Sparkles className="h-5 w-5" />
            Autre style
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

        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Crédits utilisés</span>
              <span className="font-medium">{CREDITS_COST}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-muted-foreground">Solde restant</span>
              <span className="font-medium text-primary">{result.credits_remaining}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Crédits disponibles */}
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
          <CardTitle className="text-lg flex items-center gap-2">
            <Camera className="h-5 w-5" />
            1. Ta photo
          </CardTitle>
          <CardDescription>
            Upload une photo de toi (visage bien visible)
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
                  <span>Clique pour uploader</span>
                  <span className="text-xs text-muted-foreground">PNG, JPG (max 10 Mo)</span>
                </div>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">2. Type de photo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {MODES.map((m) => {
              const Icon = m.icon
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    mode === m.id
                      ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20'
                      : 'border-border hover:border-blue-500/50'
                  }`}
                >
                  <Icon className={`h-6 w-6 mb-2 ${mode === m.id ? 'text-blue-500' : 'text-muted-foreground'}`} />
                  <div className="font-medium">{m.label}</div>
                  <div className="text-sm text-muted-foreground">{m.desc}</div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Style */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">3. Style visuel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {STYLES.map((s) => {
              const Icon = s.icon
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStyle(s.id)}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    style === s.id
                      ? 'border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/20'
                      : 'border-border hover:border-purple-500/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`h-5 w-5 ${style === s.id ? 'text-purple-500' : 'text-muted-foreground'}`} />
                    <span className="font-medium">{s.label}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">{s.desc}</div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">4. Instructions (optionnel)</CardTitle>
          <CardDescription>
            Précise ce que tu veux dans la photo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Ex: Mettre en valeur le produit dans un contexte plage ensoleillée..."
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            maxLength={300}
            rows={3}
          />
          <p className="text-xs text-muted-foreground mt-2">
            {instructions.length}/300 caractères
          </p>
        </CardContent>
      </Card>

      {/* Bouton submit */}
      <Button
        type="submit"
        size="lg"
        className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
        disabled={!canSubmit}
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Génération en cours...
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5" />
            Générer ma photo ({CREDITS_COST} crédits)
          </>
        )}
      </Button>
    </form>
  )
}
