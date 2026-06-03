'use client'

import { useState, FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Loader2, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

const ZONE_LEVELS = [
  { value: 'pays', label: 'Pays' },
  { value: 'region', label: 'Région' },
  { value: 'departement', label: 'Département' },
  { value: 'ville', label: 'Ville' },
]

const LANGUAGES = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'pt', label: 'Português' },
]

interface SparkScanFormProps {
  userId: string
}

const labelClass =
  'block text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500'
const inputClass =
  'h-12 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 text-slate-900 placeholder:text-slate-400 transition focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet-500/10'
const selectChevron =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%2394a3b8'%3E%3Cpath fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z' clip-rule='evenodd'/%3E%3C/svg%3E\")"

export function SparkScanForm({ userId: _userId }: SparkScanFormProps) {
  const [url, setUrl] = useState('')
  const [zone, setZone] = useState('Guadeloupe')
  const [niveauZone, setNiveauZone] = useState('region')
  const [langue, setLangue] = useState('fr')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!url) {
      toast.error("Colle d'abord une URL")
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/sparkscan/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          zone,
          niveau_zone: niveauZone,
          langue,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Erreur inconnue')
      }
      toast.success('Analyse lancée — implémentation à venir (V0 tâches #4/#5)')
      console.log('SparkScan analyze response:', data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.08)]"
      >
        {/* URL */}
        <div className="space-y-2">
          <label
            htmlFor="url"
            className={labelClass}
            style={{ fontFamily: 'var(--font-geist-mono)' }}
          >
            URL du site
          </label>
          <input
            id="url"
            type="url"
            required
            placeholder="https://exemple.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className={inputClass}
            style={{ fontFamily: 'var(--font-geist-mono)' }}
          />
        </div>

        {/* Zone + Niveau */}
        <div className="grid grid-cols-5 gap-3">
          <div className="col-span-3 space-y-2">
            <label
              htmlFor="zone"
              className={labelClass}
              style={{ fontFamily: 'var(--font-geist-mono)' }}
            >
              Zone
            </label>
            <input
              id="zone"
              type="text"
              placeholder="Guadeloupe / Paris…"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="col-span-2 space-y-2">
            <label
              htmlFor="niveauZone"
              className={labelClass}
              style={{ fontFamily: 'var(--font-geist-mono)' }}
            >
              Niveau
            </label>
            <select
              id="niveauZone"
              value={niveauZone}
              onChange={(e) => setNiveauZone(e.target.value)}
              className={`${inputClass} appearance-none bg-[length:1em] bg-[right_0.85rem_center] bg-no-repeat pr-10`}
              style={{ backgroundImage: selectChevron }}
            >
              {ZONE_LEVELS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Langue */}
        <div className="space-y-2">
          <label
            htmlFor="langue"
            className={labelClass}
            style={{ fontFamily: 'var(--font-geist-mono)' }}
          >
            Langue du rapport
          </label>
          <select
            id="langue"
            value={langue}
            onChange={(e) => setLangue(e.target.value)}
            className={`${inputClass} appearance-none bg-[length:1em] bg-[right_0.85rem_center] bg-no-repeat pr-10`}
            style={{ backgroundImage: selectChevron }}
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        {/* CTA */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="group flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 text-base font-medium text-white shadow-[0_4px_20px_-4px_rgba(15,23,42,0.4)] transition-all hover:bg-slate-800 hover:shadow-[0_8px_28px_-4px_rgba(15,23,42,0.45)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Analyse en cours…</span>
              </>
            ) : (
              <>
                <span>Analyser le site</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </div>

        <p
          className="pt-1 text-center text-[10px] uppercase tracking-[0.22em] text-slate-400"
          style={{ fontFamily: 'var(--font-geist-mono)' }}
        >
          ~30 secondes · 5–10 concurrents trouvés
        </p>
      </form>
    </motion.div>
  )
}
