'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Upload, Loader2, Coins, AlertCircle, Download, RefreshCw,
  Instagram, UtensilsCrossed, Wrench, Scissors, ShoppingBag,
  Dumbbell, Palmtree, Car, Music,
  Sparkles, Copy, Check, Hash, ImageIcon
} from 'lucide-react'
import { toast } from 'sonner'

const CREDITS_COST = 3
const POLL_INTERVAL = 3000
const MAX_POLLS = 40

const BUSINESS_TYPES = [
  { id: 'restaurant', label: 'Restaurant', icon: UtensilsCrossed, placeholder: 'Ex: Colombo de poulet, 12€' },
  { id: 'artisan', label: 'Artisan', icon: Wrench, placeholder: 'Ex: Rénovation salle de bain terminée' },
  { id: 'beaute', label: 'Beauté', icon: Scissors, placeholder: 'Ex: Tresses africaines, nouveau style' },
  { id: 'commerce', label: 'Commerce', icon: ShoppingBag, placeholder: 'Ex: Nouvelle collection été -20%' },
  { id: 'sport', label: 'Sport & Bien-être', icon: Dumbbell, placeholder: 'Ex: Cours de yoga en plein air' },
  { id: 'tourisme', label: 'Tourisme', icon: Palmtree, placeholder: 'Ex: Gîte vue mer, 3 chambres' },
  { id: 'auto', label: 'Auto & Moto', icon: Car, placeholder: 'Ex: Révision complète climatisation' },
  { id: 'evenementiel', label: 'Événementiel', icon: Music, placeholder: 'Ex: DJ disponible pour mariages' },
]

const POST_STYLES = [
  { id: 'plat_du_jour', label: 'Plat du jour', desc: 'Ton plat projeté dans une scène de pub TV avec ingrédients qui explosent', forTypes: ['restaurant'] },
  { id: 'promo', label: 'Promotion', desc: 'Ton sujet mis en scène comme une vraie campagne de pub pro', forTypes: ['restaurant', 'artisan', 'beaute', 'commerce', 'sport', 'tourisme', 'auto', 'evenementiel'] },
  { id: 'avant_apres', label: 'Avant / Après', desc: 'Upload 2 photos et obtiens un split screen spectaculaire', forTypes: ['artisan', 'beaute', 'auto', 'sport'] },
  { id: 'nouveau', label: 'Nouveauté', desc: 'Ton produit ou ta création révélée de manière épique', forTypes: ['restaurant', 'artisan', 'beaute', 'commerce', 'sport', 'tourisme', 'auto', 'evenementiel'] },
  { id: 'ambiance', label: 'Ambiance', desc: 'Ton lieu transformé en endroit de rêve magique', forTypes: ['restaurant', 'beaute', 'commerce', 'tourisme', 'evenementiel'] },
  { id: 'performance', label: 'Performance', desc: 'Action, puissance et énergie : une scène de film', forTypes: ['sport', 'evenementiel'] },
  { id: 'lieu', label: 'Le lieu', desc: 'Ton espace projeté dans un univers futuriste ou paradisiaque', forTypes: ['sport', 'tourisme'] },
]

const BUSINESS_GUIDES: Record<string, { title: string; tips: string[]; photo: string }> = {
  restaurant: {
    title: 'Guide Restaurant',
    tips: [
      'Prends ton plat en photo avec ton téléphone, même en barquette',
      'L\'IA adapte le décor au niveau du plat (street food ou gastronomique)',
      'Plat du jour = pub TV, Promotion = musée, Nouveauté = MasterChef, Ambiance = paradis',
    ],
    photo: 'Photo de ton plat (assiette, barquette, plateau...)',
  },
  beaute: {
    title: 'Guide Beauté',
    tips: [
      'Prends le résultat en photo (coiffure, maquillage, ongles)',
      'Promotion = shooting Instagram pro, Nouveauté = clip tropical',
      'Avant/Après : envoie 2 photos, l\'IA crée un visuel magazine',
      'L\'IA ajoute tenue et accessoires assortis au look',
    ],
    photo: 'Photo du résultat (coiffure, maquillage, ongles, soin...)',
  },
  artisan: {
    title: 'Guide Artisan',
    tips: [
      'Prends ta réalisation en photo (salle de bain, cuisine, carrelage...)',
      'Promotion = page de magazine déco, Nouveauté = maison créole',
      'Avant/Après : envoie la photo AVANT et la photo APRÈS',
    ],
    photo: 'Photo de ta réalisation terminée',
  },
  commerce: {
    title: 'Guide Commerce',
    tips: [
      'Prends ton produit en photo sur fond simple',
      'Promotion = pub type Nike/Apple, Nouveauté = unboxing de luxe',
      'Ambiance = ta boutique transformée en concept store de rêve',
    ],
    photo: 'Photo de ton produit ou de ta boutique',
  },
  sport: {
    title: 'Guide Sport & Bien-être',
    tips: [
      'Photo de toi en action ou de ta salle',
      'Promotion = super-héros, Nouveauté = sommet de la Soufrière',
      'Performance = scène de film d\'action, Le lieu = salle du futur',
    ],
    photo: 'Photo en action, de ta salle ou de ton activité',
  },
  tourisme: {
    title: 'Guide Tourisme',
    tips: [
      'Photo de ton hébergement, piscine, vue ou activité',
      'Promotion = paradis irréel, Nouveauté = spot secret',
      'Ambiance = nuit enchantée, Le lieu = vue drone de rêve',
    ],
    photo: 'Photo de ton lieu, hébergement ou activité',
  },
  auto: {
    title: 'Guide Auto & Moto',
    tips: [
      'Photo du véhicule terminé ou en cours de travail',
      'Promotion = scène Fast & Furious, Nouveauté = shooting Top Gear',
      'Avant/Après : envoie la photo AVANT et APRÈS réparation',
    ],
    photo: 'Photo du véhicule ou de ton travail',
  },
  evenementiel: {
    title: 'Guide Événementiel',
    tips: [
      'Photo de toi en action, de ta déco ou de ton événement',
      'Promotion = stade de 50 000 personnes, Nouveauté = mariage royal',
      'Ambiance = festival sur la plage, Performance = le moment du DROP',
    ],
    photo: 'Photo de ton événement, prestation ou setup',
  },
}

interface PostReseauxFormProps {
  userId: string
  credits: number
}

export function PostReseauxForm({ userId, credits: initialCredits }: PostReseauxFormProps) {
  const [imageUrl, setImageUrl] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageUrl2, setImageUrl2] = useState('')
  const [imagePreview2, setImagePreview2] = useState<string | null>(null)
  const [businessType, setBusinessType] = useState('restaurant')
  const [businessName, setBusinessName] = useState('')
  const [postStyle, setPostStyle] = useState('plat_du_jour')
  const [message, setMessage] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isUploading2, setIsUploading2] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [result, setResult] = useState<{
    image_url: string
    image_enhanced: boolean
    image_error: string | null
    caption: string
    hashtags: string
    credits_remaining: number
  } | null>(null)
  const [credits, setCredits] = useState(initialCredits)
  const [copiedCaption, setCopiedCaption] = useState(false)
  const [copiedHashtags, setCopiedHashtags] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef2 = useRef<HTMLInputElement>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  const currentBusinessType = BUSINESS_TYPES.find(b => b.id === businessType)
  const availableStyles = POST_STYLES.filter(s => s.forTypes.includes(businessType))
  const currentGuide = BUSINESS_GUIDES[businessType]
  const isAvantApres = postStyle === 'avant_apres'

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current)
    }
  }, [])

  // Reset postStyle quand le businessType change et le style n'est plus dispo
  useEffect(() => {
    if (!availableStyles.find(s => s.id === postStyle)) {
      setPostStyle(availableStyles[0]?.id || 'promo')
    }
  }, [businessType])

  // Nettoyer la 2e photo quand on quitte Avant/Après
  useEffect(() => {
    if (!isAvantApres) {
      setImageUrl2('')
      setImagePreview2(null)
      if (fileInputRef2.current) fileInputRef2.current.value = ''
    }
  }, [isAvantApres])

  // Polling fal.ai côté client
  const pollEnhancedImage = useCallback(async (statusUrl: string, responseUrl: string, attempt = 0) => {
    if (attempt >= MAX_POLLS) {
      setIsEnhancing(false)
      setResult(prev => prev ? { ...prev, image_error: 'Timeout: la retouche a pris trop de temps' } : prev)
      return
    }

    try {
      const params = new URLSearchParams({ statusUrl, responseUrl })
      const response = await fetch(`/api/post-reseaux/status?${params}`)
      const data = await response.json()

      if (data.status === 'completed' && data.image_url) {
        setIsEnhancing(false)
        setResult(prev => prev ? {
          ...prev,
          image_url: data.image_url,
          image_enhanced: true,
          image_error: null,
        } : prev)
        toast.success('Photo sublimée !')
        return
      }

      if (data.status === 'error') {
        setIsEnhancing(false)
        setResult(prev => prev ? { ...prev, image_error: data.error } : prev)
        return
      }

      // Encore en cours → re-poll
      pollRef.current = setTimeout(() => pollEnhancedImage(statusUrl, responseUrl, attempt + 1), POLL_INTERVAL)
    } catch {
      setIsEnhancing(false)
      setResult(prev => prev ? { ...prev, image_error: 'Erreur réseau' } : prev)
    }
  }, [])

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
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'upload')
      }

      setImageUrl(data.url)
      setImagePreview(URL.createObjectURL(file))
      toast.success('Image uploadée')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'upload')
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileUpload2 = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setIsUploading2(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'upload')
      }

      setImageUrl2(data.url)
      setImagePreview2(URL.createObjectURL(file))
      toast.success('Photo APRÈS uploadée')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'upload')
    } finally {
      setIsUploading2(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!imageUrl) {
      toast.error('Veuillez uploader une photo')
      return
    }

    if (credits < CREDITS_COST) {
      toast.error(`Crédits insuffisants. ${CREDITS_COST} crédits requis.`)
      return
    }

    setIsGenerating(true)

    try {
      const response = await fetch('/api/post-reseaux/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          ...(isAvantApres && imageUrl2 ? { imageUrl2 } : {}),
          businessType,
          businessName,
          postStyle,
          message
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la génération')
      }

      const r = data.result

      // Afficher la légende immédiatement avec la photo originale
      setResult({
        image_url: r.image_url,
        image_enhanced: false,
        image_error: r.fal_error || null,
        caption: r.caption,
        hashtags: r.hashtags,
        credits_remaining: r.credits_remaining,
      })
      setCredits(r.credits_remaining)
      toast.success('Légende générée !')

      // Si fal.ai a accepté le job, lancer le polling client
      if (r.fal_status_url && r.fal_response_url) {
        setIsEnhancing(true)
        pollEnhancedImage(r.fal_status_url, r.fal_response_url)
      }
    } catch (error) {
      console.error('Generation error:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la génération')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = async (text: string, type: 'caption' | 'hashtags') => {
    await navigator.clipboard.writeText(text)
    if (type === 'caption') {
      setCopiedCaption(true)
      setTimeout(() => setCopiedCaption(false), 2000)
    } else {
      setCopiedHashtags(true)
      setTimeout(() => setCopiedHashtags(false), 2000)
    }
    toast.success('Copié !')
  }

  const handleReset = () => {
    if (pollRef.current) clearTimeout(pollRef.current)
    setResult(null)
    setImageUrl('')
    setImagePreview(null)
    setImageUrl2('')
    setImagePreview2(null)
    setMessage('')
    setBusinessName('')
    setIsEnhancing(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (fileInputRef2.current) fileInputRef2.current.value = ''
  }

  const canSubmit = imageUrl && credits >= CREDITS_COST && !isGenerating && (!isAvantApres || imageUrl2)

  // Affichage du résultat
  if (result) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center gap-2 text-green-500">
          <Sparkles className="h-5 w-5" />
          <span className="font-medium">Post généré avec succès !</span>
        </div>

        {/* Visuel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Instagram className="h-5 w-5" />
              Visuel
              {isEnhancing ? (
                <span className="text-xs font-normal text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Mise en scène en cours...
                </span>
              ) : result.image_enhanced ? (
                <span className="text-xs font-normal text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">Photo sublimée</span>
              ) : result.image_error ? (
                <span className="text-xs font-normal text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full">Photo originale</span>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!isEnhancing && !result.image_enhanced && result.image_error && (
              <div className="mb-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm text-yellow-600">
                <p className="font-medium">La mise en scène IA n'a pas fonctionné</p>
                <p className="text-xs mt-1 text-muted-foreground">{result.image_error}</p>
              </div>
            )}
            <div className="relative">
              <img
                src={result.image_url}
                alt="Visuel généré"
                className="w-full rounded-lg"
              />
              {isEnhancing && (
                <div className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2 text-white">
                    <ImageIcon className="h-8 w-8 animate-pulse" />
                    <span className="text-sm font-medium">Mise en scène IA en cours...</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Légende */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Légende</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(result.caption, 'caption')}
              >
                {copiedCaption ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                {copiedCaption ? 'Copié' : 'Copier'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{result.caption}</p>
          </CardContent>
        </Card>

        {/* Hashtags */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Hashtags
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(result.hashtags, 'hashtags')}
              >
                {copiedHashtags ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                {copiedHashtags ? 'Copié' : 'Copier'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-blue-400">{result.hashtags}</p>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <a
            href={result.image_url}
            download="sparkhub-post.png"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
          >
            <Download className="h-5 w-5" />
            Télécharger
          </a>

          <Button
            variant="outline"
            onClick={() => handleCopy(`${result.caption}\n\n${result.hashtags}`, 'caption')}
            className="flex items-center gap-2"
          >
            <Copy className="h-5 w-5" />
            Tout copier
          </Button>
        </div>

        <Button
          variant="ghost"
          onClick={handleReset}
          className="w-full flex items-center gap-2"
        >
          <RefreshCw className="h-5 w-5" />
          Nouveau post
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

      {/* Type de business */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">1. Ton activité</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {BUSINESS_TYPES.map((b) => {
              const Icon = b.icon
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBusinessType(b.id)}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    businessType === b.id
                      ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20'
                      : 'border-border hover:border-blue-500/50'
                  }`}
                >
                  <Icon className={`h-6 w-6 mb-1 ${businessType === b.id ? 'text-blue-500' : 'text-muted-foreground'}`} />
                  <div className="font-medium">{b.label}</div>
                </button>
              )
            })}
          </div>

          <Input
            placeholder="Nom de ton commerce (optionnel)"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            maxLength={50}
          />
        </CardContent>
      </Card>

      {/* Guide par profil */}
      {currentGuide && (
        <Card className="border-purple-500/20 bg-purple-500/5">
          <CardContent className="pt-6">
            <p className="font-medium text-sm mb-2">{currentGuide.title}</p>
            <ul className="space-y-1">
              {currentGuide.tips.map((tip, i) => (
                <li key={i} className="text-sm text-muted-foreground flex gap-2">
                  <span className="text-purple-400 shrink-0">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Style du post */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">2. Type de post</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2">
            {availableStyles.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setPostStyle(s.id)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  postStyle === s.id
                    ? 'border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/20'
                    : 'border-border hover:border-purple-500/50'
                }`}
              >
                <div className="font-medium">{s.label}</div>
                <div className="text-sm text-muted-foreground">{s.desc}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upload photo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {isAvantApres ? '3. Ta photo AVANT' : '3. Ta photo'}
          </CardTitle>
          <CardDescription>
            {currentGuide?.photo || 'Photo de ton plat, produit, réalisation ou lieu'}
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

      {/* Upload 2e photo (Avant/Après uniquement) */}
      {isAvantApres && (
        <Card className="border-orange-500/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="h-5 w-5 text-orange-500" />
              Photo APRÈS
            </CardTitle>
            <CardDescription>
              Le résultat final de ton travail
            </CardDescription>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInputRef2}
              type="file"
              accept="image/*"
              onChange={handleFileUpload2}
              className="hidden"
            />

            {imagePreview2 ? (
              <div className="relative">
                <img
                  src={imagePreview2}
                  alt="Aperçu APRÈS"
                  className="w-full max-w-xs mx-auto rounded-lg border"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full"
                  onClick={() => fileInputRef2.current?.click()}
                  disabled={isUploading2}
                >
                  {isUploading2 ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Upload en cours...
                    </>
                  ) : (
                    'Changer la photo APRÈS'
                  )}
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full h-40 border-dashed border-orange-500/30"
                onClick={() => fileInputRef2.current?.click()}
                disabled={isUploading2}
              >
                {isUploading2 ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    Upload en cours...
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-orange-400" />
                    <span>Photo du résultat (APRÈS)</span>
                    <span className="text-xs text-muted-foreground">PNG, JPG (max 10 Mo)</span>
                  </div>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Message */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">4. Ton message</CardTitle>
          <CardDescription>
            Dis-nous ce que tu veux mettre en avant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder={currentBusinessType?.placeholder || 'Décris ce que tu veux poster...'}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={300}
            rows={3}
          />
          <p className="text-xs text-muted-foreground mt-2">
            {message.length}/300 caractères
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
            <Instagram className="h-5 w-5" />
            Générer mon post ({CREDITS_COST} crédits)
          </>
        )}
      </Button>
    </form>
  )
}
