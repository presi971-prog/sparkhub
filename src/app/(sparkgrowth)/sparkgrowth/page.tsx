/**
 * Page d'accueil SparkGrowth — la "maison" du produit 3-en-1.
 *
 * Affiche : un hero de bienvenue + les 3 "portes" de la triade en chaîne
 * (Analyser → Planifier → Fabriquer), chacune avec son STATUT VIVANT tiré de
 * la base (concurrents analysés, tâches faites/total, créations produites).
 *
 * Server component : tout le fetch se fait côté serveur via le client Supabase
 * RLS (l'utilisateur ne voit que ses propres données).
 */

import Link from 'next/link'
import { ArrowRight, Compass, Radar, Wand2 } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function SparkGrowthHomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const firstName = deriveFirstName(user)

  // ---- SparkScan : nb d'analyses terminées + concurrents de la dernière ----
  const { count: scansCount } = await supabase
    .from('sparkscan_scans')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'completed')

  const { data: lastScan } = await supabase
    .from('sparkscan_scans')
    .select('input_url, competitors_found, created_at')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ input_url: string; competitors_found: unknown[] | null }>()

  const competitorsCount = Array.isArray(lastScan?.competitors_found)
    ? lastScan!.competitors_found.length
    : 0

  // ---- SparkPilot : dernier plan + tâches faites / total ----
  const { data: lastPlan } = await supabase
    .from('sparkpilot_plans')
    .select('id, title')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; title: string }>()

  let tasksDone = 0
  let tasksTotal = 0
  if (lastPlan?.id) {
    const totalRes = await supabase
      .from('sparkpilot_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('plan_id', lastPlan.id)
    const doneRes = await supabase
      .from('sparkpilot_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('plan_id', lastPlan.id)
      .eq('status', 'done')
    tasksTotal = totalRes.count ?? 0
    tasksDone = doneRes.count ?? 0
  }

  // ---- SparkExecute : nb de créations (hors archivées) ----
  const { count: creationsCount } = await supabase
    .from('sparkexecute_runs')
    .select('id', { count: 'exact', head: true })
    .neq('status', 'archived')

  const doors: DoorData[] = [
    {
      href: '/sparkscan',
      step: '1',
      name: 'SparkScan',
      verb: 'Analyser',
      role: 'Passe tes concurrents au scanner et fait ressortir tes 3 priorités.',
      color: '#DB2777',
      tint: '#FCE7F3',
      icon: <Radar className="h-5 w-5" />,
      status:
        (scansCount ?? 0) > 0
          ? competitorsCount > 0
            ? `${competitorsCount} concurrents repérés`
            : `${scansCount} analyse${(scansCount ?? 0) > 1 ? 's' : ''} faite${(scansCount ?? 0) > 1 ? 's' : ''}`
          : 'Aucune analyse — commence ici',
      done: (scansCount ?? 0) > 0,
    },
    {
      href: '/sparkpilot',
      step: '2',
      name: 'SparkPilot',
      verb: 'Planifier',
      role: 'Transforme l’analyse en plan d’action : des tâches concrètes, datées.',
      color: '#4F46E5',
      tint: '#EEF0FF',
      icon: <Compass className="h-5 w-5" />,
      status:
        tasksTotal > 0
          ? `${tasksDone} / ${tasksTotal} tâches faites`
          : 'Aucun plan — crée-le depuis ton analyse',
      done: tasksTotal > 0,
    },
    {
      href: '/sparkexecute',
      step: '3',
      name: 'SparkExecute',
      verb: 'Fabriquer',
      role: 'Produit et publie tes contenus : articles, posts, visuels.',
      color: '#0E9F6E',
      tint: '#E7F9F1',
      icon: <Wand2 className="h-5 w-5" />,
      status:
        (creationsCount ?? 0) > 0
          ? `${creationsCount} création${(creationsCount ?? 0) > 1 ? 's' : ''}`
          : 'Aucune création — fabrique ton 1er contenu',
      done: (creationsCount ?? 0) > 0,
    },
  ]

  return (
    <div className="mx-auto max-w-[1240px] px-5 pb-20 pt-12 sm:px-8 sm:pt-16">
      {/* ---- Hero ---- */}
      <header className="max-w-2xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#8A8E79]">
          Ton moteur de croissance · Guadeloupe
        </p>
        <h1
          className="mt-4 text-[44px] leading-[1.05] tracking-tight text-[#0F1115] sm:text-[60px]"
          style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif' }}
        >
          {firstName ? `Bonjour ${firstName},` : 'Bienvenue,'}
          <br />
          voici SparkGrowth.
        </h1>
        <p className="mt-5 text-[16px] leading-relaxed text-[#4A4E57] sm:text-[17px]">
          Un seul endroit, trois étapes qui s’enchaînent. Tu{' '}
          <span style={{ color: '#DB2777' }}>analyses</span> tes concurrents, tu{' '}
          <span style={{ color: '#4F46E5' }}>planifies</span> quoi faire, puis tu{' '}
          <span style={{ color: '#0E9F6E' }}>fabriques</span> et publies. Plus
          besoin de jongler entre des outils séparés.
        </p>
      </header>

      {/* ---- Les 3 portes en chaîne ---- */}
      <section className="mt-12">
        <div className="flex flex-col items-stretch gap-4 lg:flex-row lg:items-center">
          {doors.map((d, i) => (
            <div key={d.href} className="flex flex-1 items-center gap-4 lg:contents">
              <DoorCard door={d} />
              {i < doors.length - 1 ? (
                <ArrowRight className="hidden h-5 w-5 flex-shrink-0 text-[#C8C7BE] lg:block" />
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {/* ---- Rappel du fil ---- */}
      <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.22em] text-[#8A8E79]">
        Le menu en haut te ramène ici, ou vers n’importe quelle étape, à tout moment.
      </p>
    </div>
  )
}

// ============================================================
// Composants
// ============================================================

interface DoorData {
  href: string
  step: string
  name: string
  verb: string
  role: string
  color: string
  tint: string
  icon: React.ReactNode
  status: string
  done: boolean
}

function DoorCard({ door }: { door: DoorData }) {
  return (
    <Link
      href={door.href}
      className="group relative flex flex-1 flex-col overflow-hidden rounded-2xl border border-[#E9E5D9] bg-white p-6 shadow-[0_1px_0_rgba(15,17,21,0.04),0_1px_3px_rgba(15,17,21,0.06)] transition hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(15,17,21,0.10)]"
    >
      {/* Liseré de couleur en haut */}
      <span
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: door.color }}
      />

      <div className="flex items-center justify-between">
        <span
          className="grid h-10 w-10 place-content-center rounded-xl"
          style={{ background: door.tint, color: door.color }}
        >
          {door.icon}
        </span>
        <span
          className="font-mono text-[11px] uppercase tracking-[0.22em]"
          style={{ color: door.color }}
        >
          Étape {door.step}
        </span>
      </div>

      <h2
        className="mt-5 text-[26px] leading-none tracking-tight text-[#0F1115]"
        style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif' }}
      >
        {door.verb}
      </h2>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-[#8A8E79]">
        {door.name}
      </p>

      <p className="mt-3 text-[14px] leading-relaxed text-[#4A4E57]">{door.role}</p>

      {/* Statut vivant */}
      <div className="mt-5 flex items-center gap-2">
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: door.done ? door.color : '#C8C7BE' }}
        />
        <span
          className="text-[13px] font-medium"
          style={{ color: door.done ? '#0F1115' : '#8A8E79' }}
        >
          {door.status}
        </span>
      </div>

      <span
        className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium transition group-hover:gap-2.5"
        style={{ color: door.color }}
      >
        Ouvrir <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  )
}

function deriveFirstName(user: {
  email?: string | null
  user_metadata?: Record<string, unknown> | null
} | null): string {
  if (!user) return ''
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  if (typeof meta.first_name === 'string' && meta.first_name) return meta.first_name
  if (typeof meta.full_name === 'string' && meta.full_name) {
    return meta.full_name.split(' ')[0] ?? ''
  }
  return ''
}
