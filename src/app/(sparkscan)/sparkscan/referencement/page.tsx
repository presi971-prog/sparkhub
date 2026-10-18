import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ReferencementClient from './referencement-client'
export const metadata: Metadata = { title: 'Référencement' }
export default async function ReferencementPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion?next=/sparkscan/referencement')
  return <div className="container mx-auto px-6 py-12 sm:py-16 lg:py-20">
    <div className="mx-auto min-w-0 max-w-6xl">
      <div className="mb-8"><span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-pink-700" style={{ fontFamily: 'var(--font-geist-mono)' }}><span className="h-1 w-1 rounded-full bg-pink-600" />Référencement</span></div>
      <h1 className="text-balance text-5xl font-normal leading-[1.05] tracking-[-0.02em] text-slate-900 sm:text-6xl lg:text-7xl" style={{ fontFamily: 'var(--font-instrument-serif)' }}>Vos 3 chantiers pour passer en première page de Google</h1>
      <p className="mt-6 max-w-2xl text-slate-600">Découvrez les recherches de vos clients, vos places à gagner et les textes à améliorer. La première page reste une ambition, jamais une garantie.</p>
      <ReferencementClient />
    </div>
  </div>
}
