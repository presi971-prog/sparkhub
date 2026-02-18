'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Coins, Loader2, CheckCircle2, Circle, Download, RotateCcw,
  Clock, Play, AlertTriangle, Upload, ImageIcon, X, Info, StopCircle, Trash2,
} from 'lucide-react'
import {
  UGC_TYPES, UGC_CREDITS, PIPELINE_STEPS_UGC,
  UGC_PERSONAS, UGC_LIEUX, UGC_ACTIONS, UGC_AMBIANCES,
} from './ugc-constants'
import type { UgcType, UgcPreset } from './ugc-constants'

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface PreviousJob {
  id: string
  status: string
  type: string
  qui: string
  action: string
  credits_used: number
  video_url: string | null
  error: string | null
  created_at: string
}

interface UgcCreatorFormProps {
  userId: string
  credits: number
  previousJobs: PreviousJob[]
}

type Step = 'form' | 'generating' | 'completed' | 'error'

const POLL_INTERVAL = 10000 // 10s (n8n gère tout, pas besoin de poller vite)
const MAX_POLLS = 120       // 20 min max

// ═══════════════════════════════════════════════════════════════
// Composant principal
// ═══════════════════════════════════════════════════════════════

export function UgcCreatorForm({ userId, credits, previousJobs }: UgcCreatorFormProps) {
  // État formulaire
  const [type, setType] = useState<UgcType>('Produit')
  const [qui, setQui] = useState('')
  const [lieu, setLieu] = useState('')
  const [action, setAction] = useState('')
  const [ambiance, setAmbiance] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  // État pipeline
  const [step, setStep] = useState<Step>('form')
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<string>('submitted')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [creditsRemaining, setCreditsRemaining] = useState(credits)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  // Refs pour le polling
  const pollCountRef = useRef(0)
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Image upload ──
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('Image trop lourde (max 10 Mo)')
      return
    }

    setImageFile(file)
    setErrorMessage(null)

    const reader = new FileReader()
    reader.onload = (ev) => setImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Polling ──
  const pollStatus = useCallback(async (id: string) => {
    if (pollCountRef.current >= MAX_POLLS) {
      setErrorMessage('La génération prend plus de temps que prévu. Reviens plus tard dans "Mes vidéos".')
      setStep('error')
      return
    }

    try {
      const res = await fetch(`/api/ugc-creator/status?jobId=${id}`)
      if (!res.ok) throw new Error('Erreur polling')

      const data = await res.json()
      setJobStatus(data.status)

      if (data.status === 'completed' && data.video_url) {
        setVideoUrl(data.video_url)
        setStep('completed')
        return
      }

      if (data.status === 'error') {
        setErrorMessage(data.error || 'Une erreur est survenue lors de la génération')
        setStep('error')
        return
      }

      // Continuer le polling
      pollCountRef.current += 1
      pollTimeoutRef.current = setTimeout(() => pollStatus(id), POLL_INTERVAL)
    } catch (error) {
      console.error('Poll error:', error)
      pollCountRef.current += 1
      pollTimeoutRef.current = setTimeout(() => pollStatus(id), POLL_INTERVAL * 2)
    }
  }, [])

  useEffect(() => {
    if (step === 'generating' && jobId) {
      pollCountRef.current = 0
      pollStatus(jobId)
    }

    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current)
      }
    }
  }, [step, jobId, pollStatus])

  // ── Soumission ──
  const handleSubmit = async () => {
    if (!qui || !lieu || !action || !ambiance || !imageFile) return
    if (creditsRemaining < UGC_CREDITS) return

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const formData = new FormData()
      formData.append('type', type)
      formData.append('qui', qui)
      formData.append('lieu', lieu)
      formData.append('action', action)
      formData.append('ambiance', ambiance)
      formData.append('image', imageFile)

      const res = await fetch('/api/ugc-creator/generate', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setErrorMessage(data.error || 'Erreur lors du lancement')
        setIsSubmitting(false)
        return
      }

      setJobId(data.jobId)
      setCreditsRemaining(data.credits_remaining)
      setStep('generating')
    } catch (error) {
      console.error('Submit error:', error)
      setErrorMessage('Erreur réseau. Réessaie.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Recommencer ──
  const handleReset = () => {
    setStep('form')
    setJobId(null)
    setJobStatus('submitted')
    setVideoUrl(null)
    setErrorMessage(null)
    setType('Produit')
    setQui('')
    setLieu('')
    setAction('')
    setAmbiance('')
    removeImage()
  }

  // ── Annuler la génération ──
  const handleCancel = async () => {
    if (!jobId || isCancelling) return

    setIsCancelling(true)
    try {
      // Stopper le polling immédiatement
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current)
        pollTimeoutRef.current = null
      }

      const res = await fetch('/api/ugc-creator/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      })

      const data = await res.json()

      if (res.ok) {
        setCreditsRemaining((prev) => prev + (data.credits_refunded || 0))
        setErrorMessage('Génération annulée. Tes crédits ont été remboursés.')
        setStep('error')
      } else {
        setErrorMessage(data.error || 'Erreur lors de l\'annulation')
        setStep('error')
      }
    } catch (error) {
      console.error('Cancel error:', error)
      setErrorMessage('Erreur réseau lors de l\'annulation')
      setStep('error')
    } finally {
      setIsCancelling(false)
    }
  }

  // ── Supprimer un job ──
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null)
  const [jobs, setJobs] = useState<PreviousJob[]>(previousJobs)

  const handleDelete = async (jobId: string) => {
    if (deletingJobId) return
    setDeletingJobId(jobId)
    try {
      const res = await fetch('/api/ugc-creator/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      })
      if (res.ok) {
        setJobs((prev) => prev.filter((j) => j.id !== jobId))
      }
    } catch (error) {
      console.error('Delete error:', error)
    } finally {
      setDeletingJobId(null)
    }
  }

  const canSubmit =
    qui && lieu && action && ambiance &&
    imageFile && creditsRemaining >= UGC_CREDITS && !isSubmitting

  // ═══════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* Crédits */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">{creditsRemaining} crédits</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Coins className="h-3 w-3" />
            Coût : {UGC_CREDITS} crédits
          </div>
        </CardContent>
      </Card>

      {/* ── ÉTAPE 1 : FORMULAIRE ── */}
      {step === 'form' && (
        <div className="space-y-4">
          {/* Type */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Type de sujet</label>
            <div className="grid grid-cols-2 gap-2">
              {UGC_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={`flex items-center gap-2 rounded-lg border-2 p-2.5 text-left transition-all ${
                    type === t.id
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  <span className="text-lg">{t.emoji}</span>
                  <div>
                    <span className="font-medium text-sm">{t.label}</span>
                    <p className="text-xs text-muted-foreground leading-tight">{t.description}</p>
                  </div>
                </button>
              ))}
            </div>
            {type === 'Mascotte ou personnage' && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 mt-2">
                <Info className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  La mascotte sera animée dans la vidéo comme un personnage réel.
                  Uploade une image nette de ta mascotte sur fond uni pour un meilleur résultat.
                </p>
              </div>
            )}
          </div>

          {/* Qui — grille 3 colonnes compacte */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Qui apparaît dans la vidéo ?</label>
            <div className="grid grid-cols-3 gap-1.5">
              {UGC_PERSONAS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setQui(p.value)}
                  className={`flex flex-col items-center gap-0.5 rounded-lg border-2 py-2 px-1 text-center transition-all ${
                    qui === p.value
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  <span className="text-lg">{p.emoji}</span>
                  <span className="font-medium text-xs">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Lieu — grille 3 colonnes compacte */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Où se passe la scène ?</label>
            <div className="grid grid-cols-3 gap-1.5">
              {UGC_LIEUX.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLieu(l.value)}
                  className={`flex flex-col items-center gap-0.5 rounded-lg border-2 py-2 px-1 text-center transition-all ${
                    lieu === l.value
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  <span className="text-lg">{l.emoji}</span>
                  <span className="font-medium text-xs">{l.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Action — grille 1 colonne compacte */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Que fait la personne ?</label>
            <div className="grid grid-cols-1 gap-1.5">
              {UGC_ACTIONS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAction(a.value)}
                  className={`flex items-center gap-2.5 rounded-lg border-2 py-2 px-3 text-left transition-all ${
                    action === a.value
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  <span className="text-base">{a.emoji}</span>
                  <span className="font-medium text-sm">{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Ambiance — chips horizontales */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Ambiance / Ton</label>
            <div className="flex flex-wrap gap-1.5">
              {UGC_AMBIANCES.map((am) => (
                <button
                  key={am.id}
                  type="button"
                  onClick={() => setAmbiance(am.value)}
                  className={`inline-flex items-center rounded-full border-2 px-3 py-1.5 text-sm font-medium transition-all ${
                    ambiance === am.value
                      ? 'border-primary bg-primary/10 text-primary shadow-sm'
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  {am.label}
                </button>
              ))}
            </div>
          </div>

          {/* Image upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Photo produit / mascotte</label>
            {imagePreview ? (
              <div className="relative inline-block">
                <img
                  src={imagePreview}
                  alt="Aperçu"
                  className="h-40 w-40 rounded-lg object-cover border border-border"
                />
                <button
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow-sm hover:bg-destructive/80"
                >
                  <X className="h-3 w-3" />
                </button>
                <p className="text-xs text-muted-foreground mt-1">{imageFile?.name}</p>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center w-full h-32 rounded-lg border-2 border-dashed border-border hover:border-primary/30 transition-colors"
              >
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Clique pour uploader</span>
                <span className="text-xs text-muted-foreground mt-1">JPG, PNG ou WebP (max 10 Mo)</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          {/* Erreur */}
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{errorMessage}</p>
            </div>
          )}

          {/* Bouton soumettre */}
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full h-12 text-base"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Lancement...
              </>
            ) : (
              <>
                <Play className="h-5 w-5 mr-2" />
                Générer ma vidéo UGC
                <span className="ml-2 text-xs opacity-70">({UGC_CREDITS} crédits)</span>
              </>
            )}
          </Button>

          {creditsRemaining < UGC_CREDITS && (
            <p className="text-center text-sm text-destructive">
              Crédits insuffisants. Il te faut {UGC_CREDITS} crédits.
            </p>
          )}
        </div>
      )}

      {/* ── ÉTAPE 2 : GÉNÉRATION EN COURS ── */}
      {step === 'generating' && (
        <Card>
          <CardContent className="py-8 space-y-6">
            <div className="text-center space-y-2">
              <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
              <h3 className="text-lg font-semibold">Génération en cours...</h3>
              <p className="text-sm text-muted-foreground">
                L&apos;IA analyse ton image, crée la scène UGC et génère la vidéo.
                Ça prend 2 à 5 minutes.
              </p>
            </div>

            {/* Étapes visuelles */}
            <div className="space-y-3 max-w-sm mx-auto">
              {PIPELINE_STEPS_UGC.map((s, i) => {
                const isActive = s.id === jobStatus
                const isDone =
                  (s.id === 'submitted' && ['processing', 'completed'].includes(jobStatus)) ||
                  (s.id === 'processing' && jobStatus === 'completed')

                return (
                  <div key={s.id} className="flex items-center gap-3">
                    {isDone ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    ) : isActive ? (
                      <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground/30 shrink-0" />
                    )}
                    <span className={`text-sm ${isDone ? 'text-green-600 dark:text-green-400' : isActive ? 'text-foreground font-medium' : 'text-muted-foreground/50'}`}>
                      {s.label}
                    </span>
                  </div>
                )
              })}
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Tu peux fermer cette page, la vidéo sera dans &quot;Mes vidéos&quot; une fois prête.
            </p>

            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isCancelling}
              className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Annulation...
                </>
              ) : (
                <>
                  <StopCircle className="h-4 w-4 mr-2" />
                  Annuler la génération
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── ÉTAPE 3 : TERMINÉ ── */}
      {step === 'completed' && videoUrl && (
        <Card>
          <CardContent className="py-6 space-y-4">
            <div className="text-center space-y-1">
              <CheckCircle2 className="h-10 w-10 mx-auto text-green-500" />
              <h3 className="text-lg font-semibold">Vidéo prête !</h3>
            </div>

            <div className="rounded-lg overflow-hidden bg-black">
              <video
                src={videoUrl}
                controls
                autoPlay
                playsInline
                className="w-full max-h-[500px]"
              />
            </div>

            <div className="flex gap-3">
              <Button asChild className="flex-1">
                <a href={videoUrl} download target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger
                </a>
              </Button>
              <Button variant="outline" onClick={handleReset} className="flex-1">
                <RotateCcw className="h-4 w-4 mr-2" />
                Nouvelle vidéo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── ÉTAPE 4 : ERREUR ── */}
      {step === 'error' && (
        <Card className="border-destructive/30">
          <CardContent className="py-6 space-y-4">
            <div className="text-center space-y-2">
              <AlertTriangle className="h-10 w-10 mx-auto text-destructive" />
              <h3 className="text-lg font-semibold">Erreur</h3>
              <p className="text-sm text-muted-foreground">
                {errorMessage || 'Une erreur est survenue. Tes crédits ont été remboursés.'}
              </p>
            </div>
            <Button variant="outline" onClick={handleReset} className="w-full">
              <RotateCcw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── MES VIDÉOS ── */}
      {jobs.length > 0 && step === 'form' && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Mes vidéos UGC
          </h3>
          <div className="space-y-2">
            {jobs.map((job) => (
              <Card key={job.id} className="overflow-hidden">
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-muted">
                          {job.type === 'Produit' ? '📦' : '🎭'} {job.type}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          job.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          job.status === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}>
                          {job.status === 'completed' ? 'Terminé' :
                           job.status === 'error' ? 'Erreur' :
                           job.status === 'processing' ? 'En cours...' : 'Envoyé'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        {job.action}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(job.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                        {' · '}{job.credits_used} cr
                      </p>
                    </div>

                    <div className="flex items-center gap-2 ml-3">
                      {job.video_url && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={job.video_url} download target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      {job.status === 'submitted' || job.status === 'processing' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setJobId(job.id)
                            setJobStatus(job.status)
                            setStep('generating')
                          }}
                        >
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </Button>
                      ) : null}
                      {(job.status === 'completed' || job.status === 'error') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(job.id)}
                          disabled={deletingJobId === job.id}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          {deletingJobId === job.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
