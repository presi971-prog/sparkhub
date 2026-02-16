'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Loader2, Coins, AlertCircle, Download, RefreshCw,
  Sparkles, Check, Palette, Type, Copy
} from 'lucide-react'
import { toast } from 'sonner'
import {
  BUSINESS_TYPES, LOGO_STYLES, COLOR_PALETTES, BANNER_FORMATS, LOGO_APPROACHES,
} from './logo-templates'

const CREDITS_COST = 5
const POLL_INTERVAL = 3000
const MAX_POLLS = 60

type Step = 'form' | 'generating' | 'selection' | 'pack'

interface LogoJob {
  approach: string
  prompt: string
  status_url: string | null
  response_url: string | null
  error: string | null
  image_url?: string
  status: 'pending' | 'processing' | 'completed' | 'error'
}

interface GenerateResult {
  logos: LogoJob[]
  palette: string[]
  fonts: string[]
  business_name: string
  slogan: string
  credits_remaining: number
}

interface LogoExpressFormProps {
  userId: string
  credits: number
}

export function LogoExpressForm({ userId, credits: initialCredits }: LogoExpressFormProps) {
  // Form state
  const [businessType, setBusinessType] = useState('restaurant')
  const [businessName, setBusinessName] = useState('')
  const [slogan, setSlogan] = useState('')
  const [description, setDescription] = useState('')
  const [logoStyle, setLogoStyle] = useState('moderne')
  const [selectedPalette, setSelectedPalette] = useState('ocean')
  const [credits, setCredits] = useState(initialCredits)

  // Generation state
  const [step, setStep] = useState<Step>('form')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<GenerateResult | null>(null)
  const [logoJobs, setLogoJobs] = useState<LogoJob[]>([])
  const pollRefs = useRef<NodeJS.Timeout[]>([])

  // Selection state
  const [selectedLogo, setSelectedLogo] = useState<number | null>(null)
  const [copiedColor, setCopiedColor] = useState<string | null>(null)

  // Pack / export state
  const [selectedBannerFormat, setSelectedBannerFormat] = useState('facebook')
  const [isExporting, setIsExporting] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const bannerRef = useRef<HTMLDivElement>(null)

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      pollRefs.current.forEach(t => clearTimeout(t))
    }
  }, [])

  // Poll a single logo job
  const pollLogoJob = useCallback(async (index: number, statusUrl: string, responseUrl: string, attempt = 0) => {
    if (attempt >= MAX_POLLS) {
      setLogoJobs(prev => {
        const updated = [...prev]
        updated[index] = { ...updated[index], status: 'error', error: 'Timeout' }
        return updated
      })
      return
    }

    try {
      const params = new URLSearchParams({ statusUrl, responseUrl })
      const response = await fetch(`/api/logo-express/status?${params}`)
      const data = await response.json()

      if (data.status === 'completed' && data.image_url) {
        setLogoJobs(prev => {
          const updated = [...prev]
          updated[index] = { ...updated[index], status: 'completed', image_url: data.image_url }
          return updated
        })
        return
      }

      if (data.status === 'error') {
        setLogoJobs(prev => {
          const updated = [...prev]
          updated[index] = { ...updated[index], status: 'error', error: data.error }
          return updated
        })
        return
      }

      // Encore en cours
      const timeout = setTimeout(() => pollLogoJob(index, statusUrl, responseUrl, attempt + 1), POLL_INTERVAL)
      pollRefs.current[index] = timeout
    } catch {
      setLogoJobs(prev => {
        const updated = [...prev]
        updated[index] = { ...updated[index], status: 'error', error: 'Erreur réseau' }
        return updated
      })
    }
  }, [])

  // Check if all logos are done (completed or error)
  const allLogosDone = logoJobs.length > 0 && logoJobs.every(j => j.status === 'completed' || j.status === 'error')
  const completedLogos = logoJobs.filter(j => j.status === 'completed')

  // Auto-transition to selection when all done
  useEffect(() => {
    if (allLogosDone && step === 'generating') {
      if (completedLogos.length > 0) {
        setStep('selection')
        toast.success(`${completedLogos.length} logo${completedLogos.length > 1 ? 's' : ''} généré${completedLogos.length > 1 ? 's' : ''} !`)
      } else {
        toast.error('Aucun logo n\'a pu être généré. Réessayez.')
        setStep('form')
      }
    }
  }, [allLogosDone, step, completedLogos.length])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!businessName.trim()) {
      toast.error('Le nom du commerce est obligatoire')
      return
    }

    if (credits < CREDITS_COST) {
      toast.error(`Crédits insuffisants. ${CREDITS_COST} crédits requis.`)
      return
    }

    setIsSubmitting(true)
    setStep('generating')

    try {
      const palette = COLOR_PALETTES.find(p => p.id === selectedPalette)
      const paletteColors = palette && palette.id !== 'surprise' ? [...palette.colors] : []

      const response = await fetch('/api/logo-express/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessType,
          businessName: businessName.trim(),
          slogan: slogan.trim(),
          description: description.trim(),
          logoStyle,
          paletteColors,
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la génération')
      }

      const r = data.result
      setResult(r)
      setCredits(r.credits_remaining)

      // Initialiser les jobs de polling
      const jobs: LogoJob[] = r.logos.map((logo: LogoJob) => ({
        ...logo,
        status: logo.error ? 'error' as const : 'processing' as const,
      }))
      setLogoJobs(jobs)

      // Lancer le polling pour chaque job qui a un status_url
      jobs.forEach((job: LogoJob, index: number) => {
        if (job.status_url && job.response_url) {
          pollLogoJob(index, job.status_url, job.response_url)
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

  const handleCopyColor = async (hex: string) => {
    await navigator.clipboard.writeText(hex)
    setCopiedColor(hex)
    setTimeout(() => setCopiedColor(null), 1500)
    toast.success(`${hex} copié !`)
  }

  const handleDownloadLogo = async () => {
    if (selectedLogo === null) return
    const job = logoJobs[selectedLogo]
    if (!job?.image_url) return

    const link = document.createElement('a')
    link.href = job.image_url
    link.download = `logo-${businessName.replace(/\s+/g, '-').toLowerCase()}.png`
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.click()
  }

  const handleExportElement = async (ref: React.RefObject<HTMLDivElement | null>, filename: string) => {
    if (!ref.current) return
    setIsExporting(true)
    try {
      const html2canvas = (await import('html2canvas-pro')).default
      const canvas = await html2canvas(ref.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
      })
      const link = document.createElement('a')
      link.download = filename
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Erreur lors de l\'export')
    } finally {
      setIsExporting(false)
    }
  }

  const handleReset = () => {
    pollRefs.current.forEach(t => clearTimeout(t))
    pollRefs.current = []
    setStep('form')
    setResult(null)
    setLogoJobs([])
    setSelectedLogo(null)
    setBusinessName('')
    setSlogan('')
    setDescription('')
  }

  const selectedLogoUrl = selectedLogo !== null ? logoJobs[selectedLogo]?.image_url : null
  const bannerFormat = BANNER_FORMATS.find(f => f.id === selectedBannerFormat) || BANNER_FORMATS[0]

  // ============== STEP: GENERATING (polling) ==============
  if (step === 'generating') {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-fuchsia-500" />
              Génération en cours...
            </CardTitle>
            <CardDescription>
              L'IA crée 4 concepts de logo pour {businessName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {logoJobs.map((job, index) => {
                const approach = LOGO_APPROACHES.find(a => a.id === job.approach)
                return (
                  <div
                    key={index}
                    className="aspect-square rounded-lg border overflow-hidden relative"
                  >
                    {job.status === 'completed' && job.image_url ? (
                      <img
                        src={job.image_url}
                        alt={approach?.label || `Logo ${index + 1}`}
                        className="w-full h-full object-contain bg-white"
                      />
                    ) : job.status === 'error' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-red-500/5 text-red-500 p-4">
                        <AlertCircle className="h-8 w-8 mb-2" />
                        <span className="text-xs text-center">Échec</span>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-fuchsia-500/5">
                        <div className="h-10 w-10 rounded-full border-2 border-fuchsia-500 border-t-transparent animate-spin mb-3" />
                        <span className="text-xs text-muted-foreground">{approach?.label || `Logo ${index + 1}`}</span>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1 text-center">
                      {approach?.label || `Logo ${index + 1}`}
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-center text-sm text-muted-foreground mt-4">
              {completedLogos.length}/{logoJobs.length} logos prêts
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ============== STEP: SELECTION ==============
  if (step === 'selection' && result) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center gap-2 text-green-500">
          <Sparkles className="h-5 w-5" />
          <span className="font-medium">Logos générés !</span>
        </div>

        {/* Grille 2x2 des logos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Choisis ton logo</CardTitle>
            <CardDescription>Clique sur celui qui te plaît le plus</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {logoJobs.map((job, index) => {
                if (job.status !== 'completed' || !job.image_url) return null
                const approach = LOGO_APPROACHES.find(a => a.id === job.approach)
                const isSelected = selectedLogo === index

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedLogo(index)}
                    className={`aspect-square rounded-lg border-2 overflow-hidden relative transition-all ${
                      isSelected
                        ? 'border-fuchsia-500 ring-4 ring-fuchsia-500/20 scale-[1.02]'
                        : 'border-border hover:border-fuchsia-500/50'
                    }`}
                  >
                    <img
                      src={job.image_url}
                      alt={approach?.label || `Logo ${index + 1}`}
                      className="w-full h-full object-contain bg-white"
                    />
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-fuchsia-500 text-white rounded-full p-1">
                        <Check className="h-4 w-4" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1.5 text-center">
                      {approach?.label || `Logo ${index + 1}`}
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Palette de couleurs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Palette de couleurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 justify-center">
              {result.palette.map((color, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleCopyColor(color)}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div
                    className="h-12 w-12 rounded-lg border shadow-sm group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs font-mono text-muted-foreground">
                    {copiedColor === color ? (
                      <span className="text-green-500 flex items-center gap-0.5">
                        <Check className="h-3 w-3" /> Copié
                      </span>
                    ) : color}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Polices recommandées */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Type className="h-5 w-5" />
              Polices recommandées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {result.fonts.map((font, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(font)
                    toast.success(`${font} copié !`)
                  }}
                  className="px-3 py-1.5 rounded-full border text-sm hover:bg-fuchsia-500/10 hover:border-fuchsia-500/30 transition-all flex items-center gap-1"
                >
                  {font}
                  <Copy className="h-3 w-3 text-muted-foreground" />
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Disponibles gratuitement sur Google Fonts
            </p>
          </CardContent>
        </Card>

        {/* Bouton pour passer au pack */}
        <div className="space-y-3">
          <Button
            onClick={() => {
              if (selectedLogo === null) {
                toast.error('Sélectionne un logo d\'abord')
                return
              }
              setStep('pack')
            }}
            size="lg"
            className="w-full bg-gradient-to-r from-fuchsia-500 to-purple-500 hover:from-fuchsia-600 hover:to-purple-600"
            disabled={selectedLogo === null}
          >
            <Sparkles className="h-5 w-5 mr-2" />
            Créer mon pack identité
          </Button>

          <Button
            variant="ghost"
            onClick={handleReset}
            className="w-full"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Nouveau logo
          </Button>
        </div>

        {/* Info crédits */}
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

  // ============== STEP: PACK (mockups + export) ==============
  if (step === 'pack' && result && selectedLogoUrl) {
    const palette = result.palette
    const name = result.business_name
    const sloganText = result.slogan

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center gap-2 text-fuchsia-500">
          <Sparkles className="h-5 w-5" />
          <span className="font-medium">Pack identité visuelle</span>
        </div>

        {/* Logo sélectionné */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Logo sélectionné</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className="w-48 h-48 rounded-lg border bg-white flex items-center justify-center p-4">
              <img src={selectedLogoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
            </div>
          </CardContent>
          <div className="px-6 pb-6">
            <Button onClick={handleDownloadLogo} className="w-full" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Télécharger le logo
            </Button>
          </div>
        </Card>

        {/* Carte de visite */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Carte de visite</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center mb-4">
              <div style={{ width: '525px', maxWidth: '100%' }}>
                <div style={{ transform: 'scale(0.5)', transformOrigin: 'top left', width: '200%' }}>
                  <div
                    ref={cardRef}
                    style={{
                      width: '1050px',
                      height: '600px',
                      position: 'relative',
                      overflow: 'hidden',
                      borderRadius: '16px',
                      fontFamily: result.fonts[0] || 'sans-serif',
                    }}
                  >
                    {/* Fond avec dégradé de la palette */}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: `linear-gradient(135deg, ${palette[0]} 0%, ${palette[1] || palette[0]} 50%, ${palette[2] || palette[0]} 100%)`,
                      }}
                    />
                    {/* Zone blanche pour le contenu */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '20px',
                        left: '20px',
                        right: '20px',
                        bottom: '20px',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '40px',
                        gap: '40px',
                      }}
                    >
                      {/* Logo */}
                      <div style={{ flexShrink: 0 }}>
                        <img
                          src={selectedLogoUrl}
                          alt="Logo"
                          style={{ width: '160px', height: '160px', objectFit: 'contain' }}
                          crossOrigin="anonymous"
                        />
                      </div>
                      {/* Infos */}
                      <div style={{ flex: 1 }}>
                        <h2 style={{
                          fontSize: '36px',
                          fontWeight: 'bold',
                          color: palette[0],
                          marginBottom: '8px',
                          lineHeight: 1.2,
                        }}>
                          {name}
                        </h2>
                        {sloganText && (
                          <p style={{
                            fontSize: '18px',
                            color: palette[1] || '#666',
                            fontStyle: 'italic',
                            marginBottom: '24px',
                          }}>
                            {sloganText}
                          </p>
                        )}
                        {/* Séparateur */}
                        <div style={{
                          width: '60px',
                          height: '3px',
                          backgroundColor: palette[3] || palette[0],
                          marginBottom: '20px',
                        }} />
                        {/* Fausses infos contact */}
                        <div style={{ fontSize: '16px', color: '#555', lineHeight: 1.8 }}>
                          <p>06 90 XX XX XX</p>
                          <p>contact@{name.toLowerCase().replace(/\s+/g, '')}.com</p>
                          <p>Guadeloupe</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <Button
              onClick={() => handleExportElement(cardRef, `carte-visite-${name.replace(/\s+/g, '-').toLowerCase()}.png`)}
              className="w-full"
              variant="outline"
              disabled={isExporting}
            >
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              Télécharger la carte de visite
            </Button>
          </CardContent>
        </Card>

        {/* Bannière réseaux sociaux */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bannière réseaux sociaux</CardTitle>
            <CardDescription>Choisis le format de bannière</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Sélecteur de format */}
            <div className="flex flex-wrap gap-2 mb-4">
              {BANNER_FORMATS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedBannerFormat(f.id)}
                  className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${
                    selectedBannerFormat === f.id
                      ? 'border-fuchsia-500 bg-fuchsia-500/10 ring-2 ring-fuchsia-500/20'
                      : 'border-border hover:border-fuchsia-500/50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Aperçu bannière */}
            <div className="flex justify-center mb-4 overflow-hidden">
              <div style={{
                width: `${Math.min(bannerFormat.width, 540)}px`,
                maxWidth: '100%',
              }}>
                <div style={{
                  transform: `scale(${Math.min(1, 540 / bannerFormat.width)})`,
                  transformOrigin: 'top left',
                  width: `${100 / Math.min(1, 540 / bannerFormat.width)}%`,
                }}>
                  <div
                    ref={bannerRef}
                    style={{
                      width: `${bannerFormat.width}px`,
                      height: `${bannerFormat.height}px`,
                      position: 'relative',
                      overflow: 'hidden',
                      fontFamily: result.fonts[0] || 'sans-serif',
                    }}
                  >
                    {/* Dégradé de fond */}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: `linear-gradient(135deg, ${palette[0]} 0%, ${palette[1] || palette[0]} 40%, ${palette[2] || palette[0]} 70%, ${palette[3] || palette[0]} 100%)`,
                      }}
                    />
                    {/* Overlay léger */}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'radial-gradient(ellipse at 30% 50%, rgba(255,255,255,0.15) 0%, transparent 70%)',
                      }}
                    />
                    {/* Contenu */}
                    <div
                      style={{
                        position: 'relative',
                        zIndex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        padding: '20px 40px',
                        gap: '30px',
                      }}
                    >
                      {/* Logo */}
                      <img
                        src={selectedLogoUrl}
                        alt="Logo"
                        style={{
                          width: `${Math.min(bannerFormat.height * 0.6, 200)}px`,
                          height: `${Math.min(bannerFormat.height * 0.6, 200)}px`,
                          objectFit: 'contain',
                          flexShrink: 0,
                          filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))',
                        }}
                        crossOrigin="anonymous"
                      />
                      {/* Texte */}
                      <div style={{ textAlign: 'left' }}>
                        <h2 style={{
                          fontSize: `${Math.min(bannerFormat.height * 0.15, 60)}px`,
                          fontWeight: 'bold',
                          color: '#FFFFFF',
                          textShadow: '0 2px 8px rgba(0,0,0,0.4)',
                          lineHeight: 1.2,
                          marginBottom: '8px',
                        }}>
                          {name}
                        </h2>
                        {sloganText && (
                          <p style={{
                            fontSize: `${Math.min(bannerFormat.height * 0.07, 24)}px`,
                            color: palette[4] || '#FFFFFF',
                            fontStyle: 'italic',
                            textShadow: '0 1px 4px rgba(0,0,0,0.3)',
                            opacity: 0.9,
                          }}>
                            {sloganText}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={() => handleExportElement(bannerRef, `banniere-${bannerFormat.id}-${name.replace(/\s+/g, '-').toLowerCase()}.png`)}
              className="w-full"
              variant="outline"
              disabled={isExporting}
            >
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              Télécharger la bannière {bannerFormat.label}
            </Button>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            variant="outline"
            onClick={() => setStep('selection')}
            className="w-full"
          >
            Choisir un autre logo
          </Button>
          <Button
            variant="ghost"
            onClick={handleReset}
            className="w-full"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Nouveau logo
          </Button>
        </div>

        {/* Info crédits */}
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

  // ============== STEP: FORM ==============
  const canSubmit = businessName.trim() && credits >= CREDITS_COST && !isSubmitting

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Crédits */}
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

      {/* 1. Type d'activité */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">1. Ton activité</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {BUSINESS_TYPES.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBusinessType(b.id)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  businessType === b.id
                    ? 'border-fuchsia-500 bg-fuchsia-500/10 ring-2 ring-fuchsia-500/20'
                    : 'border-border hover:border-fuchsia-500/50'
                }`}
              >
                <span className="text-xl mr-2">{b.emoji}</span>
                <span className="font-medium">{b.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 2. Nom du commerce */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">2. Nom du commerce *</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Ex: Ti Délices, Auto Pro 971, Belle & Zen..."
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            maxLength={40}
            required
          />
          <Input
            placeholder="Slogan / Tagline (optionnel)"
            value={slogan}
            onChange={(e) => setSlogan(e.target.value)}
            maxLength={60}
          />
        </CardContent>
      </Card>

      {/* 3. Description */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">3. Description courte</CardTitle>
          <CardDescription>Décris ton activité en quelques mots (optionnel)</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Ex: Restaurant créole et fruits de mer à Sainte-Anne..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={200}
            rows={2}
          />
          <p className="text-xs text-muted-foreground mt-1">{description.length}/200</p>
        </CardContent>
      </Card>

      {/* 4. Style du logo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">4. Style du logo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {LOGO_STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setLogoStyle(s.id)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  logoStyle === s.id
                    ? 'border-fuchsia-500 bg-fuchsia-500/10 ring-2 ring-fuchsia-500/20'
                    : 'border-border hover:border-fuchsia-500/50'
                }`}
              >
                <div className="font-medium text-sm">{s.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.desc}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 5. Palette de couleurs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">5. Couleurs préférées</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {COLOR_PALETTES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPalette(p.id)}
                className={`p-3 rounded-lg border transition-all ${
                  selectedPalette === p.id
                    ? 'border-fuchsia-500 ring-2 ring-fuchsia-500/20'
                    : 'border-border hover:border-fuchsia-500/50'
                }`}
              >
                <div className={`h-6 rounded-md mb-2 ${p.preview}`} />
                <span className="text-sm font-medium">{p.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bouton submit */}
      <Button
        type="submit"
        size="lg"
        className="w-full bg-gradient-to-r from-fuchsia-500 to-purple-500 hover:from-fuchsia-600 hover:to-purple-600"
        disabled={!canSubmit}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Génération en cours...
          </>
        ) : (
          <>
            <Palette className="h-5 w-5" />
            Générer mon logo ({CREDITS_COST} crédits)
          </>
        )}
      </Button>
    </form>
  )
}
