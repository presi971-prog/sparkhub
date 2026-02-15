'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowRight, ArrowLeft, Coins, Loader2, Plus, Trash2,
  Upload, Sparkles, Check, Globe, ExternalLink, Save,
  GripVertical, Eye, EyeOff,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  SITE_THEMES, getSiteTheme,
  FONT_STYLES, getFontStyle,
  SERVICES_LAYOUTS,
  PRESET_COLORS,
  SECTIONS_CONFIG, DEFAULT_SECTIONS_ORDER,
  BUSINESS_TYPES, DAYS_OF_WEEK,
  HERO_IMAGE_DEFAULTS,
  HERO_Q_STYLE, HERO_Q_SUBJECT, HERO_Q_FRAMING,
  HERO_Q_PEOPLE_COUNT, HERO_Q_PEOPLE_AGE, HERO_Q_PEOPLE_ORIGIN,
  HERO_Q_PEOPLE_ACTION, HERO_Q_PEOPLE_CLOTHING,
  HERO_Q_COMMERCE_VIEW,
  HERO_Q_PRODUCT_TYPE, HERO_Q_PRODUCT_PRESENTATION,
  HERO_Q_LANDSCAPE_TYPE,
  HERO_Q_AMBIANCE, HERO_Q_LUMIERE, HERO_Q_COULEURS,
  HERO_Q_LIEU, HERO_Q_ELEMENTS,
  type HeroImageConfig,
} from './mini-site-templates'

const CREDITS_COST = 150

type Step = 'commerce' | 'offres' | 'infos' | 'galerie' | 'reseaux' | 'style' | 'agencement' | 'generer'

const STEPS: { id: Step; label: string; num: number }[] = [
  { id: 'commerce', label: 'Mon commerce', num: 1 },
  { id: 'offres', label: 'Mes offres', num: 2 },
  { id: 'infos', label: 'Mes infos', num: 3 },
  { id: 'galerie', label: 'Ma galerie', num: 4 },
  { id: 'reseaux', label: 'Mes reseaux', num: 5 },
  { id: 'style', label: 'Mon style', num: 6 },
  { id: 'agencement', label: 'Mon agencement', num: 7 },
  { id: 'generer', label: 'Generer !', num: 8 },
]

interface ServiceItem {
  name: string
  price: string
  description: string
}

interface MiniSiteData {
  business_name: string
  business_type: string
  slogan: string
  logo_url: string
  services: ServiceItem[]
  phone: string
  email: string
  address: string
  opening_hours: Record<string, string>
  gallery_urls: string[]
  facebook_url: string
  instagram_url: string
  tiktok_url: string
  youtube_url: string
  whatsapp_number: string
  theme: string
  accent_color: string
  font_style: string
  services_layout: string
  sections_order: string[]
  hero_config: HeroImageConfig
  ai_description: string
  hero_image_url: string
  slug: string
  published: boolean
}

interface MiniSiteFormProps {
  userId: string
  credits: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  existingSite: any | null
  isAdmin?: boolean
}

// --- Composant question image de couverture ---

function HeroQuestionBlock({
  question,
  value,
  onChange,
  multiValue,
  onMultiChange,
}: {
  question: { id: string; title: string; subtitle: string; options: { id: string; label: string; icon: string }[]; multiSelect?: boolean }
  value?: string
  onChange: (val: string) => void
  multiValue?: string[]
  onMultiChange?: (vals: string[]) => void
}) {
  const isMulti = question.multiSelect && onMultiChange

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium">{question.title}</p>
        {question.subtitle && (
          <p className="text-xs text-muted-foreground">{question.subtitle}</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {question.options.map((opt) => {
          const isSelected = isMulti
            ? (multiValue || []).includes(opt.id)
            : value === opt.id

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                if (isMulti && onMultiChange) {
                  const current = multiValue || []
                  if (current.includes(opt.id)) {
                    onMultiChange(current.filter(v => v !== opt.id))
                  } else {
                    onMultiChange([...current, opt.id])
                  }
                } else {
                  onChange(value === opt.id ? '' : opt.id)
                }
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-sm transition-all ${
                isSelected
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-border hover:border-primary/40 hover:bg-muted/50'
              }`}
            >
              <span className="text-base">{opt.icon}</span>
              <span>{opt.label}</span>
              {isSelected && <Check className="h-3.5 w-3.5 ml-1" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export function MiniSiteForm({ userId, credits: initialCredits, existingSite, isAdmin }: MiniSiteFormProps) {
  const isEditing = !!existingSite

  const [step, setStep] = useState<Step>('commerce')
  const [credits, setCredits] = useState(initialCredits)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [generationDone, setGenerationDone] = useState(isEditing && !!existingSite?.ai_description)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // Etat du formulaire
  const [data, setData] = useState<MiniSiteData>(() => {
    if (existingSite) {
      return {
        business_name: existingSite.business_name || '',
        business_type: existingSite.business_type || '',
        slogan: existingSite.slogan || '',
        logo_url: existingSite.logo_url || '',
        services: existingSite.services || [{ name: '', price: '', description: '' }],
        phone: existingSite.phone || '',
        email: existingSite.email || '',
        address: existingSite.address || '',
        opening_hours: existingSite.opening_hours || {},
        gallery_urls: existingSite.gallery_urls || [],
        facebook_url: existingSite.facebook_url || '',
        instagram_url: existingSite.instagram_url || '',
        tiktok_url: existingSite.tiktok_url || '',
        youtube_url: existingSite.youtube_url || '',
        whatsapp_number: existingSite.whatsapp_number || '',
        theme: existingSite.theme || 'tropical_creole',
        accent_color: existingSite.accent_color || '#E67E22',
        font_style: existingSite.font_style || 'moderne',
        services_layout: existingSite.services_layout || 'cards',
        sections_order: existingSite.sections_order || DEFAULT_SECTIONS_ORDER,
        hero_config: existingSite.hero_config || HERO_IMAGE_DEFAULTS,
        ai_description: existingSite.ai_description || '',
        hero_image_url: existingSite.hero_image_url || '',
        slug: existingSite.slug || '',
        published: existingSite.published || false,
      }
    }
    return {
      business_name: '',
      business_type: '',
      slogan: '',
      logo_url: '',
      services: [{ name: '', price: '', description: '' }],
      phone: '',
      email: '',
      address: '',
      opening_hours: {},
      gallery_urls: [],
      facebook_url: '',
      instagram_url: '',
      tiktok_url: '',
      youtube_url: '',
      whatsapp_number: '',
      theme: 'tropical_creole',
      accent_color: '#E67E22',
      font_style: 'moderne',
      services_layout: 'cards',
      sections_order: DEFAULT_SECTIONS_ORDER,
      hero_config: HERO_IMAGE_DEFAULTS,
      ai_description: '',
      hero_image_url: '',
      slug: '',
      published: false,
    }
  })

  const update = (fields: Partial<MiniSiteData>) => {
    setData(prev => ({ ...prev, ...fields }))
  }

  // --- Navigation ---
  const currentStepIndex = STEPS.findIndex(s => s.id === step)
  const canGoBack = currentStepIndex > 0
  const canGoNext = currentStepIndex < STEPS.length - 1

  const goBack = () => {
    if (canGoBack) setStep(STEPS[currentStepIndex - 1].id)
  }
  const goNext = () => {
    if (canGoNext) setStep(STEPS[currentStepIndex + 1].id)
  }

  // --- Upload photo galerie ---
  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Selectionne une image')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image trop volumineuse (max 10 Mo)')
      return
    }
    if (data.gallery_urls.length >= 6) {
      toast.error('Maximum 6 photos')
      return
    }

    setIsUploadingPhoto(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      update({ gallery_urls: [...data.gallery_urls, result.url] })
      toast.success('Photo ajoutee')
    } catch {
      toast.error('Erreur upload')
    } finally {
      setIsUploadingPhoto(false)
      if (galleryInputRef.current) galleryInputRef.current.value = ''
    }
  }

  // --- Upload logo ---
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Selectionne une image')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo trop volumineux (max 5 Mo)')
      return
    }

    setIsUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      update({ logo_url: result.url })
      toast.success('Logo uploade')
    } catch {
      toast.error('Erreur upload logo')
    } finally {
      setIsUploadingLogo(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
  }

  // --- Generation IA ---
  const handleGenerate = async () => {
    if (!data.business_name.trim()) {
      toast.error('Le nom du commerce est obligatoire')
      setStep('commerce')
      return
    }

    if (!isEditing && !isAdmin && credits < CREDITS_COST) {
      toast.error(`Credits insuffisants. ${CREDITS_COST} credits requis.`)
      return
    }

    setIsGenerating(true)
    try {
      const res = await fetch('/api/mini-site/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: data.business_name,
          business_type: data.business_type,
          slogan: data.slogan,
          services: data.services.filter(s => s.name.trim()),
          address: data.address,
          theme: data.theme,
          hero_config: data.hero_config,
          is_update: isEditing,
        }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error)

      update({
        ai_description: result.ai_description,
        hero_image_url: result.hero_image_url || data.hero_image_url,
        slug: result.slug || data.slug || slugify(data.business_name),
      })

      setCredits(result.credits_remaining ?? credits)
      setGenerationDone(true)
      toast.success(isEditing ? 'Site mis a jour !' : 'Site genere ! 🎉')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur generation')
    } finally {
      setIsGenerating(false)
    }
  }

  // --- Sauvegarde (gratuite apres generation) ---
  const handleSave = async (publish: boolean) => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/mini-site/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          published: publish,
          services: data.services.filter(s => s.name.trim()),
        }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error)

      update({ slug: result.slug, published: publish })

      if (publish) {
        toast.success('Site publie ! Il est en ligne.')
      } else {
        toast.success('Brouillon sauvegarde')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur sauvegarde')
    } finally {
      setIsSaving(false)
    }
  }

  // --- Services management ---
  const addService = () => {
    update({ services: [...data.services, { name: '', price: '', description: '' }] })
  }
  const removeService = (index: number) => {
    update({ services: data.services.filter((_, i) => i !== index) })
  }
  const updateService = (index: number, field: keyof ServiceItem, value: string) => {
    const updated = [...data.services]
    updated[index] = { ...updated[index], [field]: value }
    update({ services: updated })
  }

  // --- Sections order management ---
  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...data.sections_order]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newOrder.length) return
    ;[newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]]
    update({ sections_order: newOrder })
  }

  const toggleSection = (sectionId: string) => {
    if (data.sections_order.includes(sectionId)) {
      update({ sections_order: data.sections_order.filter(s => s !== sectionId) })
    } else {
      update({ sections_order: [...data.sections_order, sectionId] })
    }
  }

  // ============================
  // RENDER
  // ============================

  const siteUrl = data.slug
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/site/${data.slug}`
    : null

  return (
    <div className="space-y-6">
      {/* Barre de progression */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setStep(s.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              step === s.id
                ? 'bg-primary text-primary-foreground'
                : i < currentStepIndex
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px]">
              {i < currentStepIndex ? <Check className="h-3 w-3" /> : s.num}
            </span>
            <span className="hidden sm:inline">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Credits */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">{credits} credits</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {isAdmin ? 'Admin — gratuit' : isEditing ? 'Modifications gratuites' : `${CREDITS_COST} credits pour generer`}
          </span>
        </CardContent>
      </Card>

      {/* ================================ */}
      {/* ETAPE 1 : Mon commerce */}
      {/* ================================ */}
      {step === 'commerce' && (
        <Card>
          <CardHeader>
            <CardTitle>Mon commerce</CardTitle>
            <CardDescription>Les infos de base sur ton activite</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nom du commerce *</label>
              <Input
                value={data.business_name}
                onChange={e => update({ business_name: e.target.value })}
                placeholder="Ex: Chez Tatie Simone"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Type d&apos;activite</label>
              <select
                value={data.business_type}
                onChange={e => update({ business_type: e.target.value })}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Selectionne...</option>
                {BUSINESS_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Slogan</label>
              <Input
                value={data.slogan}
                onChange={e => update({ slogan: e.target.value })}
                placeholder="Ex: Le meilleur bokit de Pointe-a-Pitre"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Logo</label>
              <div className="mt-1 flex items-center gap-3">
                {data.logo_url ? (
                  <div className="relative h-16 w-16">
                    <img src={data.logo_url} alt="Logo" className="h-16 w-16 rounded-lg object-cover" />
                    <button
                      onClick={() => update({ logo_url: '' })}
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={isUploadingLogo}
                  >
                    {isUploadingLogo ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                    Ajouter un logo
                  </Button>
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================================ */}
      {/* ETAPE 2 : Mes offres */}
      {/* ================================ */}
      {step === 'offres' && (
        <Card>
          <CardHeader>
            <CardTitle>Mes offres</CardTitle>
            <CardDescription>Liste tes services ou produits avec les prix</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.services.map((service, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="flex-1 space-y-2">
                  <Input
                    value={service.name}
                    onChange={e => updateService(i, 'name', e.target.value)}
                    placeholder="Nom du service / produit"
                  />
                  <div className="flex gap-2">
                    <Input
                      value={service.price}
                      onChange={e => updateService(i, 'price', e.target.value)}
                      placeholder="Prix (ex: 5€)"
                      className="w-28"
                    />
                    <Input
                      value={service.description}
                      onChange={e => updateService(i, 'description', e.target.value)}
                      placeholder="Description courte (optionnel)"
                      className="flex-1"
                    />
                  </div>
                </div>
                {data.services.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => removeService(i)} className="mt-1">
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addService}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une offre
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ================================ */}
      {/* ETAPE 3 : Mes infos */}
      {/* ================================ */}
      {step === 'infos' && (
        <Card>
          <CardHeader>
            <CardTitle>Mes infos</CardTitle>
            <CardDescription>Horaires, telephone, email, adresse</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Telephone</label>
                <Input
                  value={data.phone}
                  onChange={e => update({ phone: e.target.value })}
                  placeholder="0690 XX XX XX"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  value={data.email}
                  onChange={e => update({ email: e.target.value })}
                  placeholder="contact@moncommerce.com"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Adresse</label>
              <Input
                value={data.address}
                onChange={e => update({ address: e.target.value })}
                placeholder="Rue, ville"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Horaires d&apos;ouverture</label>
              <div className="space-y-2">
                {DAYS_OF_WEEK.map(day => (
                  <div key={day} className="flex items-center gap-2">
                    <span className="w-24 text-sm text-muted-foreground">{day}</span>
                    <Input
                      value={data.opening_hours[day] || ''}
                      onChange={e => update({
                        opening_hours: { ...data.opening_hours, [day]: e.target.value }
                      })}
                      placeholder="Ex: 8h-18h ou Ferme"
                      className="flex-1"
                    />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================================ */}
      {/* ETAPE 4 : Ma galerie */}
      {/* ================================ */}
      {step === 'galerie' && (
        <Card>
          <CardHeader>
            <CardTitle>Ma galerie</CardTitle>
            <CardDescription>Upload jusqu&apos;a 6 photos de ton commerce</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {data.gallery_urls.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border">
                  <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    onClick={() => update({ gallery_urls: data.gallery_urls.filter((_, idx) => idx !== i) })}
                    className="absolute top-1 right-1 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}

              {data.gallery_urls.length < 6 && (
                <button
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors"
                >
                  {isUploadingPhoto ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Ajouter</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              onChange={handleGalleryUpload}
              className="hidden"
            />
            <p className="text-xs text-muted-foreground">
              {data.gallery_urls.length}/6 photos. Max 10 Mo par photo.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ================================ */}
      {/* ETAPE 5 : Mes reseaux */}
      {/* ================================ */}
      {step === 'reseaux' && (
        <Card>
          <CardHeader>
            <CardTitle>Mes reseaux</CardTitle>
            <CardDescription>Liens vers tes reseaux sociaux</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium">Facebook</label>
              <Input
                value={data.facebook_url}
                onChange={e => update({ facebook_url: e.target.value })}
                placeholder="https://facebook.com/..."
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Instagram</label>
              <Input
                value={data.instagram_url}
                onChange={e => update({ instagram_url: e.target.value })}
                placeholder="https://instagram.com/..."
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">TikTok</label>
              <Input
                value={data.tiktok_url}
                onChange={e => update({ tiktok_url: e.target.value })}
                placeholder="https://tiktok.com/@..."
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">YouTube</label>
              <Input
                value={data.youtube_url}
                onChange={e => update({ youtube_url: e.target.value })}
                placeholder="https://youtube.com/..."
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">WhatsApp</label>
              <Input
                value={data.whatsapp_number}
                onChange={e => update({ whatsapp_number: e.target.value })}
                placeholder="0690 XX XX XX"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Un bouton WhatsApp flottant apparaitra sur ton site
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================================ */}
      {/* ETAPE 6 : Mon style */}
      {/* ================================ */}
      {step === 'style' && (
        <div className="space-y-4">
          {/* Ambiance */}
          <Card>
            <CardHeader>
              <CardTitle>Ambiance visuelle</CardTitle>
              <CardDescription>Choisis le style general de ton site</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {SITE_THEMES.map(theme => (
                  <button
                    key={theme.id}
                    onClick={() => update({ theme: theme.id })}
                    className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                      data.theme === theme.id
                        ? 'border-primary ring-2 ring-primary/30'
                        : 'border-transparent hover:border-primary/30'
                    }`}
                  >
                    <div className={`h-20 ${theme.previewBg}`} />
                    <div className="p-2 bg-card">
                      <p className="text-xs font-medium">{theme.name}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{theme.description}</p>
                    </div>
                    {data.theme === theme.id && (
                      <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Image de couverture — questionnaire intelligent */}
          <Card>
            <CardHeader>
              <CardTitle>Mon image de couverture</CardTitle>
              <CardDescription>
                Reponds a ces questions et l&apos;IA creera une image sur mesure pour ton site.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* ===== STYLE VISUEL ===== */}
              <HeroQuestionBlock
                question={HERO_Q_STYLE}
                value={data.hero_config.style}
                onChange={(val) => update({ hero_config: { ...data.hero_config, style: val } })}
              />

              {/* ===== SUJET PRINCIPAL ===== */}
              {data.hero_config.style && (
                <HeroQuestionBlock
                  question={HERO_Q_SUBJECT}
                  value={data.hero_config.subject}
                  onChange={(val) => {
                    update({
                      hero_config: {
                        ...data.hero_config,
                        subject: val,
                        subject_detail: '',
                        include_people: val === 'personnes',
                        people_count: undefined,
                        people_age: undefined,
                        people_origin: undefined,
                        people_action: undefined,
                        people_clothing: undefined,
                        commerce_view: undefined,
                        product_type: undefined,
                        product_presentation: undefined,
                        landscape_type: undefined,
                      },
                    })
                  }}
                />
              )}

              {/* ===== DESCRIPTION PRECISE — pour les besoins specifiques ===== */}
              {data.hero_config.subject && (
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium">Decris precisement ce que tu veux voir</p>
                    <p className="text-xs text-muted-foreground">
                      {data.hero_config.subject === 'concept'
                        ? 'Ex: "Un cerveau lumineux avec des connexions neuronales", "Un arbre qui pousse a partir d\'un livre"'
                        : data.hero_config.subject === 'objet'
                          ? 'Ex: "Un telephone pose sur une table en bois", "Un bouquet de fleurs tropicales"'
                          : data.hero_config.subject === 'personnes'
                            ? 'Ex: "Un chef cuisinier fier devant ses plats", "Une famille souriante a table"'
                            : data.hero_config.subject === 'produits'
                              ? 'Ex: "Des bokits dores et croustillants", "Des cocktails colores face a la mer"'
                              : data.hero_config.subject === 'commerce'
                                ? 'Ex: "Un restaurant chaleureux avec des tables en terrasse", "Un salon moderne et lumineux"'
                                : 'Ex: "Un coucher de soleil sur la plage de Sainte-Anne"'
                      }
                    </p>
                  </div>
                  <Input
                    value={data.hero_config.subject_detail}
                    onChange={e => update({ hero_config: { ...data.hero_config, subject_detail: e.target.value } })}
                    placeholder="Decris en quelques mots ce que tu imagines..."
                    className="mt-1"
                  />
                </div>
              )}

              {/* ===== CADRAGE ===== */}
              {data.hero_config.subject && (
                <HeroQuestionBlock
                  question={HERO_Q_FRAMING}
                  value={data.hero_config.framing}
                  onChange={(val) => update({ hero_config: { ...data.hero_config, framing: val } })}
                />
              )}

              {/* ===== QUESTIONS CONDITIONNELLES — Personnes ===== */}
              {data.hero_config.subject && data.hero_config.subject !== 'personnes' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => update({ hero_config: { ...data.hero_config, include_people: !data.hero_config.include_people } })}
                      className={`relative h-6 w-11 rounded-full transition-colors ${
                        data.hero_config.include_people ? 'bg-primary' : 'bg-muted'
                      }`}
                    >
                      <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                        data.hero_config.include_people ? 'translate-x-5' : ''
                      }`} />
                    </button>
                    <div>
                      <p className="text-sm font-medium">Ajouter des personnes dans l&apos;image ?</p>
                    </div>
                  </div>
                </div>
              )}

              {(data.hero_config.subject === 'personnes' || data.hero_config.include_people) && (
                <>
                  <HeroQuestionBlock
                    question={HERO_Q_PEOPLE_COUNT}
                    value={data.hero_config.people_count}
                    onChange={(val) => update({ hero_config: { ...data.hero_config, people_count: val } })}
                  />
                  <HeroQuestionBlock
                    question={HERO_Q_PEOPLE_AGE}
                    value={data.hero_config.people_age}
                    onChange={(val) => update({ hero_config: { ...data.hero_config, people_age: val } })}
                  />
                  <HeroQuestionBlock
                    question={HERO_Q_PEOPLE_ORIGIN}
                    value={data.hero_config.people_origin}
                    onChange={(val) => update({ hero_config: { ...data.hero_config, people_origin: val } })}
                  />
                  <HeroQuestionBlock
                    question={HERO_Q_PEOPLE_ACTION}
                    value={data.hero_config.people_action}
                    onChange={(val) => update({ hero_config: { ...data.hero_config, people_action: val } })}
                  />
                  <HeroQuestionBlock
                    question={HERO_Q_PEOPLE_CLOTHING}
                    value={data.hero_config.people_clothing}
                    onChange={(val) => update({ hero_config: { ...data.hero_config, people_clothing: val } })}
                  />
                </>
              )}

              {/* ===== QUESTIONS CONDITIONNELLES — Commerce ===== */}
              {data.hero_config.subject === 'commerce' && (
                <HeroQuestionBlock
                  question={HERO_Q_COMMERCE_VIEW}
                  value={data.hero_config.commerce_view}
                  onChange={(val) => update({ hero_config: { ...data.hero_config, commerce_view: val } })}
                />
              )}

              {/* ===== QUESTIONS CONDITIONNELLES — Produits ===== */}
              {data.hero_config.subject === 'produits' && (
                <>
                  <HeroQuestionBlock
                    question={HERO_Q_PRODUCT_TYPE}
                    value={data.hero_config.product_type}
                    onChange={(val) => update({ hero_config: { ...data.hero_config, product_type: val } })}
                  />
                  <HeroQuestionBlock
                    question={HERO_Q_PRODUCT_PRESENTATION}
                    value={data.hero_config.product_presentation}
                    onChange={(val) => update({ hero_config: { ...data.hero_config, product_presentation: val } })}
                  />
                </>
              )}

              {/* ===== QUESTIONS CONDITIONNELLES — Paysage ===== */}
              {data.hero_config.subject === 'paysage' && (
                <HeroQuestionBlock
                  question={HERO_Q_LANDSCAPE_TYPE}
                  value={data.hero_config.landscape_type}
                  onChange={(val) => update({ hero_config: { ...data.hero_config, landscape_type: val } })}
                />
              )}

              {/* ===== SEPARATEUR — QUESTIONS UNIVERSELLES ===== */}
              {data.hero_config.subject && (
                <>
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-card px-3 text-xs text-muted-foreground">Ambiance & atmosphere</span>
                    </div>
                  </div>

                  <HeroQuestionBlock
                    question={HERO_Q_AMBIANCE}
                    value={data.hero_config.ambiance}
                    onChange={(val) => update({ hero_config: { ...data.hero_config, ambiance: val } })}
                  />
                  <HeroQuestionBlock
                    question={HERO_Q_LUMIERE}
                    value={data.hero_config.lumiere}
                    onChange={(val) => update({ hero_config: { ...data.hero_config, lumiere: val } })}
                  />
                  <HeroQuestionBlock
                    question={HERO_Q_COULEURS}
                    value={data.hero_config.couleurs}
                    onChange={(val) => update({ hero_config: { ...data.hero_config, couleurs: val } })}
                  />
                  <HeroQuestionBlock
                    question={HERO_Q_LIEU}
                    value={data.hero_config.lieu}
                    onChange={(val) => update({ hero_config: { ...data.hero_config, lieu: val } })}
                  />
                  <HeroQuestionBlock
                    question={HERO_Q_ELEMENTS}
                    value={undefined}
                    onChange={() => {}}
                    multiValue={data.hero_config.elements || []}
                    onMultiChange={(vals) => update({ hero_config: { ...data.hero_config, elements: vals } })}
                  />
                </>
              )}
            </CardContent>
          </Card>

          {/* Couleur principale */}
          <Card>
            <CardHeader>
              <CardTitle>Couleur principale</CardTitle>
              <CardDescription>Les boutons, titres et accents prendront cette couleur</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-3">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color.hex}
                    onClick={() => update({ accent_color: color.hex })}
                    className={`h-8 w-8 rounded-full border-2 transition-all ${
                      data.accent_color === color.hex
                        ? 'border-foreground scale-110'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={data.accent_color}
                  onChange={e => update({ accent_color: e.target.value })}
                  className="h-8 w-8 rounded cursor-pointer"
                />
                <Input
                  value={data.accent_color}
                  onChange={e => update({ accent_color: e.target.value })}
                  placeholder="#3B82F6"
                  className="w-28"
                />
                <span className="text-xs text-muted-foreground">ou choisis ta couleur</span>
              </div>
            </CardContent>
          </Card>

          {/* Police */}
          <Card>
            <CardHeader>
              <CardTitle>Police d&apos;ecriture</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {FONT_STYLES.map(font => (
                  <button
                    key={font.id}
                    onClick={() => update({ font_style: font.id })}
                    className={`p-3 rounded-lg border-2 text-center transition-all ${
                      data.font_style === font.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <p className="font-semibold text-sm">{font.name}</p>
                    <p className="text-xs text-muted-foreground">{font.description}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Layout services */}
          <Card>
            <CardHeader>
              <CardTitle>Mise en page des services</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {SERVICES_LAYOUTS.map(layout => (
                  <button
                    key={layout.id}
                    onClick={() => update({ services_layout: layout.id })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      data.services_layout === layout.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/30'
                    }`}
                  >
                    {layout.id === 'cards' ? (
                      <div className="space-y-1 mb-2">
                        <div className="h-4 w-full rounded bg-muted" />
                        <div className="h-4 w-full rounded bg-muted" />
                      </div>
                    ) : (
                      <div className="space-y-1 mb-2">
                        <div className="flex justify-between">
                          <div className="h-3 w-20 rounded bg-muted" />
                          <div className="h-3 w-8 rounded bg-muted" />
                        </div>
                        <div className="flex justify-between">
                          <div className="h-3 w-24 rounded bg-muted" />
                          <div className="h-3 w-8 rounded bg-muted" />
                        </div>
                      </div>
                    )}
                    <p className="text-sm font-medium">{layout.name}</p>
                    <p className="text-xs text-muted-foreground">{layout.description}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ================================ */}
      {/* ETAPE 7 : Mon agencement */}
      {/* ================================ */}
      {step === 'agencement' && (
        <Card>
          <CardHeader>
            <CardTitle>Mon agencement</CardTitle>
            <CardDescription>Choisis quelles sections afficher et dans quel ordre</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* Sections activees, dans l'ordre */}
              {data.sections_order.map((sectionId, index) => {
                const section = SECTIONS_CONFIG.find(s => s.id === sectionId)
                if (!section) return null
                return (
                  <div
                    key={sectionId}
                    className="flex items-center gap-2 p-2 rounded-lg border bg-card"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{section.icon}</span>
                    <span className="flex-1 text-sm font-medium">{section.name}</span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={index === 0}
                        onClick={() => moveSection(index, 'up')}
                      >
                        <ArrowLeft className="h-3 w-3 rotate-90" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={index === data.sections_order.length - 1}
                        onClick={() => moveSection(index, 'down')}
                      >
                        <ArrowRight className="h-3 w-3 rotate-90" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => toggleSection(sectionId)}
                      >
                        <EyeOff className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                  </div>
                )
              })}

              {/* Sections desactivees */}
              {SECTIONS_CONFIG
                .filter(s => !data.sections_order.includes(s.id))
                .map(section => (
                  <div
                    key={section.id}
                    className="flex items-center gap-2 p-2 rounded-lg border border-dashed opacity-50"
                  >
                    <span className="text-sm">{section.icon}</span>
                    <span className="flex-1 text-sm">{section.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => toggleSection(section.id)}
                    >
                      <Eye className="h-3 w-3 text-green-500" />
                    </Button>
                  </div>
                ))
              }
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================================ */}
      {/* ETAPE 8 : Generer ! */}
      {/* ================================ */}
      {step === 'generer' && (
        <div className="space-y-4">
          {/* Resume */}
          <Card>
            <CardHeader>
              <CardTitle>Resume</CardTitle>
              <CardDescription>Verifie avant de generer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Commerce</div>
                <div className="font-medium">{data.business_name || '—'}</div>
                <div className="text-muted-foreground">Type</div>
                <div>{data.business_type || '—'}</div>
                <div className="text-muted-foreground">Services</div>
                <div>{data.services.filter(s => s.name.trim()).length} offres</div>
                <div className="text-muted-foreground">Photos</div>
                <div>{data.gallery_urls.length} photos</div>
                <div className="text-muted-foreground">Ambiance</div>
                <div>{getSiteTheme(data.theme).name}</div>
                <div className="text-muted-foreground">Police</div>
                <div>{getFontStyle(data.font_style).name}</div>
              </div>
            </CardContent>
          </Card>

          {/* Bouton generer */}
          {!generationDone ? (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="py-6 text-center space-y-4">
                <Sparkles className="h-10 w-10 text-primary mx-auto" />
                <div>
                  <p className="font-semibold text-lg">Pret a generer ton site ?</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    L&apos;IA va ecrire un texte marketing et generer une image de couverture.
                  </p>
                </div>
                <Button
                  size="lg"
                  onClick={handleGenerate}
                  disabled={isGenerating || (!isEditing && !isAdmin && credits < CREDITS_COST)}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Generation en cours...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      {isAdmin ? 'Generer mon site (gratuit)' : `Generer mon site (${CREDITS_COST} credits)`}
                    </>
                  )}
                </Button>
                {!isEditing && !isAdmin && credits < CREDITS_COST && (
                  <p className="text-xs text-red-500">
                    Credits insuffisants. Tu as {credits} credits, il en faut {CREDITS_COST}.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Apercu texte IA */}
              <Card>
                <CardHeader>
                  <CardTitle>Texte genere par l&apos;IA</CardTitle>
                  <CardDescription>Tu peux le modifier avant de publier</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={data.ai_description}
                    onChange={e => update({ ai_description: e.target.value })}
                    rows={6}
                  />
                </CardContent>
              </Card>

              {/* Image hero */}
              {data.hero_image_url && (
                <Card>
                  <CardHeader>
                    <CardTitle>Image de couverture</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <img
                      src={data.hero_image_url}
                      alt="Couverture"
                      className="w-full rounded-lg"
                    />
                  </CardContent>
                </Card>
              )}

              {/* Boutons publier / brouillon / regenerer */}
              <div className="flex flex-col gap-2">
                <Button
                  size="lg"
                  onClick={() => handleSave(true)}
                  disabled={isSaving}
                  className="w-full"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Globe className="h-4 w-4 mr-2" />
                  )}
                  Publier mon site
                </Button>

                <Button
                  variant="outline"
                  onClick={() => handleSave(false)}
                  disabled={isSaving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Sauvegarder en brouillon
                </Button>

                {isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    Regenerer (gratuit)
                  </Button>
                )}
              </div>

              {/* Lien vers le site */}
              {data.published && siteUrl && (
                <Card className="border-green-500/30 bg-green-500/5">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-600">Ton site est en ligne !</p>
                        <p className="text-xs text-muted-foreground mt-0.5 break-all">{siteUrl}</p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a href={siteUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Voir
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* Navigation bas */}
      <div className="flex justify-between pt-2">
        <Button
          variant="outline"
          onClick={goBack}
          disabled={!canGoBack}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        {canGoNext && (
          <Button onClick={goNext}>
            Suivant
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  )
}
