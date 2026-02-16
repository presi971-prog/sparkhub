'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Coins, Loader2, CheckCircle2, Circle, Download, RotateCcw, Clock, Play, AlertTriangle, Sparkles, Lightbulb } from 'lucide-react'
import { VIDEO_TIERS, AMBIANCES, MUSIC_MOODS, PIPELINE_STEPS, IDEA_THEMES } from './video-constants'
import type { VideoTierId } from './video-constants'

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface PreviousJob {
  id: string
  status: string
  idea: string
  tier: string
  scenes_count: number
  duration_seconds: number
  credits_used: number
  final_video_url: string | null
  error: string | null
  created_at: string
}

interface SparkVideoFormProps {
  userId: string
  credits: number
  previousJobs: PreviousJob[]
}

interface ProgressData {
  status: string
  currentStep: { name: string; completed: number; total: number }
  overallProgress: number
  finalVideoUrl?: string
  error?: string
}

type Step = 'form' | 'generating' | 'completed' | 'error'

const POLL_INTERVAL = 5000
const MAX_POLLS = 300

// ═══════════════════════════════════════════════════════════════
// Composant principal
// ═══════════════════════════════════════════════════════════════

export function SparkVideoForm({ userId, credits, previousJobs }: SparkVideoFormProps) {
  // État formulaire
  const [idea, setIdea] = useState('')
  const [selectedTier, setSelectedTier] = useState<VideoTierId>('short')
  const [selectedAmbiance, setSelectedAmbiance] = useState<string | null>(null)
  const [selectedMusicMood, setSelectedMusicMood] = useState<string | null>(null)

  // État générateur d'idées
  const [showIdeasPanel, setShowIdeasPanel] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null)
  const [generatedIdeas, setGeneratedIdeas] = useState<string[]>([])
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false)
  const [ideasError, setIdeasError] = useState<string | null>(null)

  // État pipeline
  const [step, setStep] = useState<Step>('form')
  const [jobId, setJobId] = useState<string | null>(null)
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [creditsRemaining, setCreditsRemaining] = useState(credits)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Refs pour le polling
  const pollCountRef = useRef(0)
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Vérifier si un job est en cours au chargement
  useEffect(() => {
    const activeJob = previousJobs.find(j =>
      j.status !== 'completed' && j.status !== 'error'
    )
    if (activeJob) {
      setJobId(activeJob.id)
      setIdea(activeJob.idea)
      setStep('generating')
    }
  }, [previousJobs])

  // ── Polling ──
  const pollStatus = useCallback(async (id: string) => {
    if (pollCountRef.current >= MAX_POLLS) {
      setErrorMessage('La génération prend plus de temps que prévu. Reviens plus tard dans "Mes vidéos".')
      return
    }

    try {
      const res = await fetch(`/api/spark-video/status?jobId=${id}`)
      if (!res.ok) throw new Error('Erreur polling')

      const data: ProgressData = await res.json()
      setProgress(data)

      if (data.status === 'completed' && data.finalVideoUrl) {
        setFinalVideoUrl(data.finalVideoUrl)
        setStep('completed')
        return
      }

      if (data.status === 'error') {
        setErrorMessage(data.error || 'Une erreur est survenue')
        setStep('error')
        return
      }

      // Continuer le polling
      pollCountRef.current += 1
      pollTimeoutRef.current = setTimeout(() => pollStatus(id), POLL_INTERVAL)
    } catch (error) {
      console.error('Poll error:', error)
      // Réessayer après un délai plus long
      pollCountRef.current += 1
      pollTimeoutRef.current = setTimeout(() => pollStatus(id), POLL_INTERVAL * 2)
    }
  }, [])

  // Démarrer le polling quand on a un jobId et qu'on est en mode generating
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
    if (!idea.trim()) return

    const tierConfig = VIDEO_TIERS[selectedTier]
    if (creditsRemaining < tierConfig.credits) return

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const res = await fetch('/api/spark-video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idea: idea.trim(),
          tier: selectedTier,
          ambiance: selectedAmbiance,
          musicMood: selectedMusicMood,
        }),
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

  // ── Générer des idées ──
  const handleGenerateIdeas = async () => {
    if (!selectedTheme) {
      setIdeasError('DEBUG: Aucune thématique sélectionnée')
      return
    }
    if (creditsRemaining < 1) {
      setIdeasError(`DEBUG: Crédits insuffisants (${creditsRemaining} crédits)`)
      return
    }

    setIsGeneratingIdeas(true)
    setGeneratedIdeas([])
    setIdeasError(null)

    try {
      const res = await fetch('/api/spark-video/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: selectedTheme }),
      })

      const data = await res.json()

      if (!res.ok) {
        setIdeasError(`Erreur ${res.status}: ${data.error || JSON.stringify(data)}`)
        setIsGeneratingIdeas(false)
        return
      }

      setGeneratedIdeas(data.ideas || [])
      setCreditsRemaining(data.credits_remaining)
    } catch (err) {
      console.error('Ideas generation error:', err)
      setIdeasError(`Erreur réseau: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsGeneratingIdeas(false)
    }
  }

  // ── Reset ──
  const handleReset = () => {
    setStep('form')
    setJobId(null)
    setProgress(null)
    setFinalVideoUrl(null)
    setErrorMessage(null)
    setIdea('')
    setSelectedAmbiance(null)
    setSelectedMusicMood(null)
    pollCountRef.current = 0
  }

  const tierConfig = VIDEO_TIERS[selectedTier]
  const canAfford = creditsRemaining >= tierConfig.credits

  // ═══════════════════════════════════════════════════════════════
  // RENDU
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* ── Crédits ── */}
      <Card className="border-red-500/20 bg-red-500/5">
        <CardContent className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium">{creditsRemaining} crédits</span>
          </div>
          {step === 'form' && (
            <span className="text-xs text-muted-foreground">
              Coût : {tierConfig.credits} crédits ({tierConfig.name})
            </span>
          )}
        </CardContent>
      </Card>

      {/* ── Historique (Mes vidéos) ── */}
      {step === 'form' && previousJobs.filter(j => j.status === 'completed' && j.final_video_url).length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Mes vidéos</h2>
          <div className="space-y-2">
            {previousJobs
              .filter(j => j.status === 'completed' && j.final_video_url)
              .slice(0, 3)
              .map(job => (
                <Card key={job.id} className="overflow-hidden">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{job.idea}</p>
                        <p className="text-xs text-muted-foreground">
                          {VIDEO_TIERS[job.tier as VideoTierId]?.name || job.tier} · {job.duration_seconds}s · {new Date(job.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setFinalVideoUrl(job.final_video_url)
                            setIdea(job.idea)
                            setStep('completed')
                          }}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Voir
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                        >
                          <a href={job.final_video_url!} download target="_blank" rel="noopener noreferrer">
                            <Download className="h-3 w-3" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}

      {/* ── FORMULAIRE ── */}
      {step === 'form' && (
        <div className="space-y-6">
          {/* ── Générateur d'idées ── */}
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="py-3 space-y-3">
              <button
                type="button"
                onClick={() => setShowIdeasPanel(!showIdeasPanel)}
                className="flex items-center gap-2 w-full text-left"
              >
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">Inspire-moi</span>
                <span className="text-xs text-muted-foreground">(1 crédit)</span>
              </button>

              {showIdeasPanel && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Choisis une thématique, l&apos;IA te propose 5 idées de vidéo
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {IDEA_THEMES.map(theme => (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setSelectedTheme(
                          selectedTheme === theme.id ? null : theme.id
                        )}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
                          selectedTheme === theme.id
                            ? 'border-amber-500 bg-amber-500/10 text-amber-600'
                            : 'border-border hover:border-amber-500/30'
                        }`}
                      >
                        {theme.emoji} {theme.label}
                      </button>
                    ))}
                  </div>

                  {selectedTheme && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleGenerateIdeas}
                      disabled={isGeneratingIdeas || creditsRemaining < 1}
                      className="w-full"
                    >
                      {isGeneratingIdeas ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                          Génération en cours...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3 mr-2" />
                          Générer 5 idées (1 crédit)
                        </>
                      )}
                    </Button>
                  )}

                  {/* Erreur idées */}
                  {ideasError && (
                    <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-2">
                      {ideasError}
                    </p>
                  )}

                  {/* Idées générées */}
                  {generatedIdeas.length > 0 && (
                    <div className="space-y-2">
                      {generatedIdeas.map((ideaText, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setIdea(ideaText)
                            setShowIdeasPanel(false)
                          }}
                          className="w-full text-left rounded-lg border border-border p-2.5 text-sm hover:border-amber-500/30 hover:bg-amber-500/5 transition-all"
                        >
                          {ideaText}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Textarea — Idée */}
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="idea">
              Décris ta vidéo
            </label>
            <textarea
              id="idea"
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Ex : Un chat blanc qui cuisine des frites sur une plage tropicale, une promo pour mon salon de coiffure, un tutoriel drôle de mécanique auto..."
              maxLength={500}
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
            />
            <p className="text-xs text-muted-foreground text-right">
              {idea.length}/500
            </p>
          </div>

          {/* Sélecteur de tier */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Durée de la vidéo</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.entries(VIDEO_TIERS) as [VideoTierId, typeof VIDEO_TIERS[VideoTierId]][]).map(([tierId, tier]) => {
                const selected = selectedTier === tierId
                const affordable = creditsRemaining >= tier.credits
                return (
                  <button
                    key={tierId}
                    type="button"
                    onClick={() => setSelectedTier(tierId)}
                    disabled={!affordable}
                    className={`relative rounded-lg border p-3 text-left transition-all ${
                      selected
                        ? 'border-red-500 bg-red-500/10 ring-2 ring-red-500/20'
                        : affordable
                          ? 'border-border hover:border-red-500/30 hover:bg-red-500/5'
                          : 'border-border opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="text-lg mb-1">{tier.emoji}</div>
                    <div className="font-medium text-sm">{tier.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {tier.scenes} scènes · {tier.durationSec}s
                    </div>
                    <div className="text-xs font-medium mt-1">
                      {tier.credits} crédits
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      ~{tier.estMinutes} min
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Ambiance (optionnel) */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Ambiance <span className="text-muted-foreground font-normal">(optionnel)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {AMBIANCES.map(amb => (
                <button
                  key={amb.id}
                  type="button"
                  onClick={() => setSelectedAmbiance(
                    selectedAmbiance === amb.id ? null : amb.id
                  )}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
                    selectedAmbiance === amb.id
                      ? 'border-red-500 bg-red-500/10 text-red-600'
                      : 'border-border hover:border-red-500/30'
                  }`}
                >
                  {amb.emoji} {amb.label}
                </button>
              ))}
            </div>
          </div>

          {/* Style musical (optionnel) */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Style musical <span className="text-muted-foreground font-normal">(optionnel)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {MUSIC_MOODS.map(mood => (
                <button
                  key={mood.id}
                  type="button"
                  onClick={() => setSelectedMusicMood(
                    selectedMusicMood === mood.id ? null : mood.id
                  )}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
                    selectedMusicMood === mood.id
                      ? 'border-red-500 bg-red-500/10 text-red-600'
                      : 'border-border hover:border-red-500/30'
                  }`}
                >
                  {mood.emoji} {mood.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bouton submit */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={!idea.trim() || !canAfford || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Lancement en cours...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Générer ma vidéo ({tierConfig.credits} crédits)
              </>
            )}
          </Button>

          {!canAfford && (
            <p className="text-sm text-destructive text-center">
              Crédits insuffisants. Il te faut {tierConfig.credits} crédits.
            </p>
          )}

          {errorMessage && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="py-3">
                <p className="text-sm text-destructive">{errorMessage}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── PROGRESSION ── */}
      {step === 'generating' && (
        <div className="space-y-6">
          <Card>
            <CardContent className="py-4 space-y-1">
              <p className="text-sm font-medium">Idée :</p>
              <p className="text-sm text-muted-foreground">{idea}</p>
            </CardContent>
          </Card>

          {/* Étapes du pipeline */}
          <div className="space-y-3">
            {PIPELINE_STEPS.map((pStep) => {
              const currentStatus = progress?.status || 'scenes'
              const stepIndex = PIPELINE_STEPS.findIndex(s => s.id === pStep.id)
              const currentIndex = PIPELINE_STEPS.findIndex(s => s.id === currentStatus)

              let icon
              let statusText = ''
              let className = 'text-muted-foreground'

              if (stepIndex < currentIndex || currentStatus === 'completed') {
                // Étape terminée
                icon = <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                statusText = 'fait !'
                className = 'text-foreground'
              } else if (stepIndex === currentIndex && currentStatus !== 'completed') {
                // Étape en cours
                icon = <Loader2 className="h-5 w-5 text-red-500 animate-spin shrink-0" />
                if (progress?.currentStep) {
                  const { completed, total } = progress.currentStep
                  statusText = total > 1 ? `${completed}/${total}` : 'en cours...'
                } else {
                  statusText = 'en cours...'
                }
                className = 'text-foreground font-medium'
              } else {
                // Étape en attente
                icon = <Circle className="h-5 w-5 text-muted-foreground/30 shrink-0" />
                className = 'text-muted-foreground/50'
              }

              return (
                <div key={pStep.id} className={`flex items-center gap-3 ${className}`}>
                  {icon}
                  <span className="text-sm flex-1">{pStep.label}</span>
                  <span className="text-xs text-muted-foreground">{statusText}</span>
                </div>
              )
            })}
          </div>

          {/* Barre de progression globale */}
          {progress && (
            <div className="space-y-2">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full transition-all duration-500"
                  style={{ width: `${progress.overallProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {progress.overallProgress}%
              </p>
            </div>
          )}

          {/* Message info */}
          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardContent className="py-3 flex items-start gap-2">
              <Clock className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Tu peux fermer cette page. Ta vidéo sera disponible dans &quot;Mes vidéos&quot; quand tu reviendras.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── ERREUR ── */}
      {step === 'error' && (
        <div className="space-y-4">
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="py-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">Erreur de génération</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {errorMessage || 'Une erreur est survenue pendant la génération.'}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Tes crédits ont été remboursés.
                </p>
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleReset} className="w-full">
            <RotateCcw className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
        </div>
      )}

      {/* ── RÉSULTAT ── */}
      {step === 'completed' && finalVideoUrl && (
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <video
              src={finalVideoUrl}
              controls
              autoPlay
              playsInline
              className="w-full rounded-t-lg"
              style={{ maxHeight: '500px' }}
            />
            <CardContent className="py-3">
              <p className="text-sm text-muted-foreground truncate">{idea}</p>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button asChild className="flex-1">
              <a href={finalVideoUrl} download target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4 mr-2" />
                Télécharger
              </a>
            </Button>
            <Button variant="outline" onClick={handleReset} className="flex-1">
              <RotateCcw className="h-4 w-4 mr-2" />
              Nouvelle vidéo
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
