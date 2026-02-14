'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Camera, PenLine, ClipboardPaste, Upload, Loader2, Plus, Trash2,
  ArrowRight, ArrowLeft, Coins, AlertCircle,
  UtensilsCrossed, Check, Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { MENU_TEMPLATES, type MenuTemplate } from './menu-templates'
import { MenuPreview } from './menu-preview'

const CREDITS_COST = 3

const DEFAULT_CATEGORIES = ['Entrees', 'Plats', 'Desserts', 'Boissons']

interface MenuItem {
  name: string
  price: number | null
  description?: string | null
}

interface MenuCategory {
  name: string
  items: MenuItem[]
}

interface RestaurantInfo {
  name: string
  slogan: string
  address: string
  phone: string
  hours: string
  logoUrl: string
}

interface MenuFormProps {
  userId: string
  credits: number
}

type Step = 'mode' | 'items' | 'info' | 'template' | 'preview'

export function MenuForm({ userId, credits: initialCredits }: MenuFormProps) {
  const [step, setStep] = useState<Step>('mode')
  const [mode, setMode] = useState<'photo' | 'manual' | 'paste' | null>(null)
  const [pasteText, setPasteText] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [categories, setCategories] = useState<MenuCategory[]>(
    DEFAULT_CATEGORIES.map(name => ({ name, items: [] }))
  )
  const [restaurantInfo, setRestaurantInfo] = useState<RestaurantInfo>({
    name: '', slogan: '', address: '', phone: '', hours: '', logoUrl: '',
  })
  const [selectedTemplate, setSelectedTemplate] = useState<string>('tropical_elegant')
  const [credits, setCredits] = useState(initialCredits)
  const [creditsRemaining, setCreditsRemaining] = useState(initialCredits)
  const [isUploading, setIsUploading] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // Upload photo pour OCR
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setIsUploading(true)
    setPhotoPreview(URL.createObjectURL(file))

    try {
      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
      const uploadData = await uploadRes.json()

      if (!uploadRes.ok) throw new Error(uploadData.error || 'Erreur upload')

      // Lancer l'OCR
      setIsExtracting(true)
      setIsUploading(false)

      const extractRes = await fetch('/api/menu/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: uploadData.url }),
      })

      const extractData = await extractRes.json()

      if (!extractRes.ok) throw new Error(extractData.error || 'Erreur extraction')

      if (extractData.categories && extractData.categories.length > 0) {
        setCategories(extractData.categories)
        toast.success(`${extractData.categories.reduce((sum: number, c: MenuCategory) => sum + c.items.length, 0)} plats detectes !`)
      } else {
        toast.error('Aucun plat detecte. Reessaie ou saisis manuellement.')
      }

      setStep('items')
    } catch (error) {
      console.error('Photo extract error:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'analyse')
    } finally {
      setIsUploading(false)
      setIsExtracting(false)
    }
  }

  // Extraction depuis texte colle
  const handleTextExtract = async () => {
    if (!pasteText.trim()) {
      toast.error('Colle ton menu dans le champ texte')
      return
    }

    setIsParsing(true)

    try {
      const res = await fetch('/api/menu/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuText: pasteText }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Erreur extraction')

      if (data.categories && data.categories.length > 0) {
        setCategories(data.categories)
        toast.success(`${data.categories.reduce((sum: number, c: MenuCategory) => sum + c.items.length, 0)} plats detectes !`)
      } else {
        toast.error('Aucun plat detecte. Verifie ton texte ou saisis manuellement.')
      }

      setStep('items')
    } catch (error) {
      console.error('Text extract error:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'analyse')
    } finally {
      setIsParsing(false)
    }
  }

  // Upload logo
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Selectionne une image')
      return
    }

    setIsUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Erreur upload')

      setRestaurantInfo(prev => ({ ...prev, logoUrl: data.url }))
      toast.success('Logo uploade')
    } catch (error) {
      toast.error('Erreur lors de l\'upload du logo')
    } finally {
      setIsUploadingLogo(false)
    }
  }

  // Ajouter une categorie
  const addCategory = () => {
    setCategories(prev => [...prev, { name: 'Nouvelle categorie', items: [] }])
  }

  // Supprimer une categorie
  const removeCategory = (idx: number) => {
    setCategories(prev => prev.filter((_, i) => i !== idx))
  }

  // Renommer une categorie
  const renameCategory = (idx: number, name: string) => {
    setCategories(prev => prev.map((cat, i) => i === idx ? { ...cat, name } : cat))
  }

  // Ajouter un item
  const addItem = (catIdx: number) => {
    setCategories(prev => prev.map((cat, i) =>
      i === catIdx
        ? { ...cat, items: [...cat.items, { name: '', price: null, description: '' }] }
        : cat
    ))
  }

  // Supprimer un item
  const removeItem = (catIdx: number, itemIdx: number) => {
    setCategories(prev => prev.map((cat, i) =>
      i === catIdx
        ? { ...cat, items: cat.items.filter((_, j) => j !== itemIdx) }
        : cat
    ))
  }

  // Modifier un item
  const updateItem = (catIdx: number, itemIdx: number, field: keyof MenuItem, value: string | number | null) => {
    setCategories(prev => prev.map((cat, i) =>
      i === catIdx
        ? {
            ...cat,
            items: cat.items.map((item, j) =>
              j === itemIdx ? { ...item, [field]: value } : item
            ),
          }
        : cat
    ))
  }

  // Generer les descriptions IA
  const handleGenerate = async () => {
    if (credits < CREDITS_COST) {
      toast.error(`Credits insuffisants. ${CREDITS_COST} credits requis.`)
      return
    }

    // Filtrer les categories vides
    const validCategories = categories
      .map(cat => ({ ...cat, items: cat.items.filter(item => item.name.trim()) }))
      .filter(cat => cat.items.length > 0)

    if (validCategories.length === 0) {
      toast.error('Ajoute au moins un plat')
      return
    }

    setIsGenerating(true)

    try {
      const res = await fetch('/api/menu/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categories: validCategories,
          restaurantInfo,
        }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Erreur generation')

      setCategories(data.categories)
      setCreditsRemaining(data.credits_remaining)
      setCredits(data.credits_remaining)
      setShowPreview(true)
      setStep('preview')
      toast.success('Menu genere avec succes !')
    } catch (error) {
      console.error('Generate error:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la generation')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleReset = () => {
    setStep('mode')
    setMode(null)
    setCategories(DEFAULT_CATEGORIES.map(name => ({ name, items: [] })))
    setRestaurantInfo({ name: '', slogan: '', address: '', phone: '', hours: '', logoUrl: '' })
    setSelectedTemplate('tropical_elegant')
    setShowPreview(false)
    setPhotoPreview(null)
    setPasteText('')
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  const totalItems = categories.reduce((sum, cat) => sum + cat.items.filter(i => i.name.trim()).length, 0)
  const template = MENU_TEMPLATES.find(t => t.id === selectedTemplate) || MENU_TEMPLATES[0]

  // Etape 5 : Apercu
  if (showPreview) {
    return (
      <MenuPreview
        categories={categories.map(cat => ({ ...cat, items: cat.items.filter(i => i.name.trim()) })).filter(cat => cat.items.length > 0)}
        restaurantInfo={restaurantInfo}
        template={template}
        creditsRemaining={creditsRemaining}
        onBack={() => { setShowPreview(false); setStep('template') }}
        onReset={handleReset}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Barre de progression */}
      <div className="flex items-center gap-2 print:hidden">
        {['mode', 'items', 'info', 'template'].map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`h-2 flex-1 rounded-full transition-colors ${
              ['mode', 'items', 'info', 'template'].indexOf(step) >= i
                ? 'bg-orange-500'
                : 'bg-muted'
            }`} />
          </div>
        ))}
      </div>

      {/* Credits */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-blue-500" />
              <span className="font-medium">Credits disponibles</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold">{credits}</span>
              <p className="text-sm text-muted-foreground">Cout: {CREDITS_COST} credits</p>
            </div>
          </div>
          {credits < CREDITS_COST && (
            <div className="mt-4 flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Credits insuffisants</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Etape 1 : Choix du mode */}
      {step === 'mode' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">1. Comment veux-tu creer ton menu ?</CardTitle>
            <CardDescription>L'extraction (photo ou texte) est gratuite</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isExtracting || isParsing}
                className="p-5 rounded-lg border-2 border-dashed hover:border-orange-500/50 transition-all flex flex-col items-center gap-2 text-center"
              >
                {isUploading || isExtracting ? (
                  <>
                    <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
                    <span className="text-sm font-medium">{isExtracting ? 'Analyse...' : 'Upload...'}</span>
                  </>
                ) : (
                  <>
                    <Camera className="h-8 w-8 text-orange-500" />
                    <span className="text-sm font-medium">Photo</span>
                    <span className="text-[10px] text-muted-foreground">L'IA detecte tes plats</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setMode('paste')}
                disabled={isUploading || isExtracting || isParsing}
                className={`p-5 rounded-lg border-2 border-dashed transition-all flex flex-col items-center gap-2 text-center ${
                  mode === 'paste' ? 'border-orange-500 bg-orange-500/5' : 'hover:border-orange-500/50'
                }`}
              >
                <ClipboardPaste className="h-8 w-8 text-orange-500" />
                <span className="text-sm font-medium">Coller</span>
                <span className="text-[10px] text-muted-foreground">Copier-coller ton menu</span>
              </button>

              <button
                type="button"
                onClick={() => { setMode('manual'); setStep('items') }}
                disabled={isUploading || isExtracting || isParsing}
                className="p-5 rounded-lg border-2 border-dashed hover:border-orange-500/50 transition-all flex flex-col items-center gap-2 text-center"
              >
                <PenLine className="h-8 w-8 text-orange-500" />
                <span className="text-sm font-medium">Manuel</span>
                <span className="text-[10px] text-muted-foreground">Tape tes plats</span>
              </button>
            </div>

            {/* Zone de texte pour le mode coller */}
            {mode === 'paste' && (
              <div className="space-y-3">
                <Textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={"Colle ton menu ici, par exemple :\n\nEntrees\nAccras de morue 6€\nBoudin creole 5€\n\nPlats\nColombo de poulet 12€\nCourt-bouillon de poisson 14€\n\nDesserts\nFlan coco 5€\nBanane flambee 6€"}
                  rows={10}
                  className="font-mono text-sm"
                />
                <Button
                  onClick={handleTextExtract}
                  disabled={!pasteText.trim() || isParsing}
                  className="w-full gap-2"
                >
                  {isParsing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyse en cours...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Analyser mon menu
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Etape 2 : Plats */}
      {step === 'items' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5" />
                2. Tes plats
              </CardTitle>
              <CardDescription>
                {totalItems} plat{totalItems > 1 ? 's' : ''} — Ajoute, modifie ou supprime
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {categories.map((cat, catIdx) => (
                <div key={catIdx} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={cat.name}
                      onChange={(e) => renameCategory(catIdx, e.target.value)}
                      className="font-semibold text-lg"
                      placeholder="Nom de la categorie"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCategory(catIdx)}
                      className="text-destructive shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {cat.items.map((item, itemIdx) => (
                    <div key={itemIdx} className="ml-4 flex items-start gap-2">
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <Input
                            value={item.name}
                            onChange={(e) => updateItem(catIdx, itemIdx, 'name', e.target.value)}
                            placeholder="Nom du plat"
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            value={item.price ?? ''}
                            onChange={(e) => updateItem(catIdx, itemIdx, 'price', e.target.value ? parseFloat(e.target.value) : null)}
                            placeholder="Prix"
                            className="w-24"
                          />
                        </div>
                        <Input
                          value={item.description || ''}
                          onChange={(e) => updateItem(catIdx, itemIdx, 'description', e.target.value)}
                          placeholder="Description (optionnel — l'IA peut la generer)"
                          className="text-sm"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(catIdx, itemIdx)}
                        className="text-destructive shrink-0 mt-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addItem(catIdx)}
                    className="ml-4 gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Ajouter un plat
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addCategory}
                className="w-full gap-2"
              >
                <Plus className="h-4 w-4" />
                Ajouter une categorie
              </Button>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('mode')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
            <Button
              onClick={() => setStep('info')}
              disabled={totalItems === 0}
              className="flex-1 gap-2"
            >
              Suivant
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      {/* Etape 3 : Infos restaurant */}
      {step === 'info' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">3. Ton restaurant</CardTitle>
              <CardDescription>Seul le nom est obligatoire</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Nom du restaurant *</label>
                <Input
                  value={restaurantInfo.name}
                  onChange={(e) => setRestaurantInfo(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Chez Tatie Simone"
                  maxLength={60}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Slogan / accroche</label>
                <Input
                  value={restaurantInfo.slogan}
                  onChange={(e) => setRestaurantInfo(prev => ({ ...prev, slogan: e.target.value }))}
                  placeholder="Ex: La vraie cuisine creole depuis 1995"
                  maxLength={80}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Adresse</label>
                <Input
                  value={restaurantInfo.address}
                  onChange={(e) => setRestaurantInfo(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Ex: 12 rue de la Liberte, Pointe-a-Pitre"
                  maxLength={100}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Telephone</label>
                <Input
                  value={restaurantInfo.phone}
                  onChange={(e) => setRestaurantInfo(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Ex: 0590 12 34 56"
                  maxLength={20}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Horaires</label>
                <Textarea
                  value={restaurantInfo.hours}
                  onChange={(e) => setRestaurantInfo(prev => ({ ...prev, hours: e.target.value }))}
                  placeholder="Ex: Lun-Sam 11h30-15h / 18h-22h&#10;Dimanche ferme"
                  rows={3}
                  maxLength={200}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Logo (optionnel)</label>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                {restaurantInfo.logoUrl ? (
                  <div className="flex items-center gap-3">
                    <img src={restaurantInfo.logoUrl} alt="Logo" className="h-16 w-16 rounded-lg object-cover border" />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={isUploadingLogo}
                    >
                      {isUploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Changer'}
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-20 border-dashed gap-2"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={isUploadingLogo}
                  >
                    {isUploadingLogo ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Upload className="h-5 w-5" />
                        Uploader un logo
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('items')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
            <Button
              onClick={() => setStep('template')}
              disabled={!restaurantInfo.name.trim()}
              className="flex-1 gap-2"
            >
              Suivant
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      {/* Etape 4 : Choix du template */}
      {step === 'template' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">4. Choisis ton style</CardTitle>
              <CardDescription>6 templates visuels pour ton menu</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {MENU_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTemplate(t.id)}
                    className={`relative p-0 rounded-lg border-2 overflow-hidden transition-all ${
                      selectedTemplate === t.id
                        ? 'border-orange-500 ring-2 ring-orange-500/20'
                        : 'border-border hover:border-orange-500/50'
                    }`}
                  >
                    {/* Miniature */}
                    <div className={`h-28 ${t.previewBg} flex flex-col items-center justify-center p-3`}>
                      <span className={`text-xs font-bold ${t.previewAccent} uppercase tracking-wider`}>
                        {restaurantInfo.name || 'Mon Restaurant'}
                      </span>
                      <div className="mt-2 space-y-0.5 w-full px-2">
                        <div className={`h-1 rounded ${t.previewAccent} opacity-60 w-3/4 mx-auto`} style={{ backgroundColor: t.accentColor }} />
                        <div className={`h-0.5 rounded opacity-30 w-1/2 mx-auto`} style={{ backgroundColor: t.accentColor }} />
                        <div className={`h-0.5 rounded opacity-30 w-2/3 mx-auto`} style={{ backgroundColor: t.accentColor }} />
                      </div>
                    </div>

                    {/* Nom */}
                    <div className="px-3 py-2 bg-background">
                      <p className="text-xs font-medium truncate">{t.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{t.description}</p>
                    </div>

                    {/* Check */}
                    {selectedTemplate === t.id && (
                      <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-orange-500 flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('info')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || credits < CREDITS_COST}
              className="flex-1 gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generation en cours...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Generer mon menu ({CREDITS_COST} credits)
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
