import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: "Conditions d'utilisation",
  description:
    "Conditions d'utilisation et politique de données de SparkScan.",
}

export default function SparkScanCguPage() {
  return (
    <div className="container mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <Link
        href="/sparkscan"
        className="inline-flex items-center gap-1.5 text-sm text-violet-700 hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Retour à SparkScan
      </Link>

      <h1
        className="mt-8 text-balance text-4xl font-normal leading-tight tracking-[-0.02em] text-slate-900 sm:text-5xl"
        style={{ fontFamily: 'var(--font-instrument-serif)' }}
      >
        Conditions d&apos;utilisation
      </h1>
      <p
        className="mt-2 text-[10px] uppercase tracking-[0.22em] text-slate-400"
        style={{ fontFamily: 'var(--font-geist-mono)' }}
      >
        SparkScan v0.6 · dernière mise à jour 25 mai 2026
      </p>

      <div className="prose prose-slate mt-10 max-w-none">
        <h2 className="text-xl font-semibold text-slate-900">
          1. Nature des conseils
        </h2>
        <p className="mt-2 text-slate-700">
          SparkScan génère des analyses concurrentielles et des recommandations
          stratégiques de manière automatisée, en s&apos;appuyant sur des
          fournisseurs tiers (DataForSEO, Apify, Anthropic Claude, Perplexity)
          et sur l&apos;intelligence artificielle générative.
        </p>
        <p className="mt-2 text-slate-700">
          Toutes les recommandations sont fournies à{' '}
          <strong>titre indicatif</strong>. Elles ne constituent pas un conseil
          stratégique professionnel personnalisé et doivent être validées par
          un professionnel qualifié avant toute mise en œuvre.
          L&apos;utilisateur reste seul responsable des décisions qu&apos;il
          prend sur la base des rapports SparkScan.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-slate-900">
          2. Aucune garantie de résultat
        </h2>
        <p className="mt-2 text-slate-700">
          Les estimations chiffrées (gain potentiel, coût, KPI, score de
          visibilité) sont des projections basées sur des modèles statistiques
          et des analyses IA. Elles ne constituent pas une promesse de
          performance. L&apos;éditeur de SparkScan ne peut être tenu
          responsable d&apos;une absence de résultat ou d&apos;une perte
          financière liée à la mise en œuvre des recommandations.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-slate-900">
          3. Données analysées et politique de rétention
        </h2>
        <p className="mt-2 text-slate-700">
          SparkScan analyse uniquement des données publiques accessibles sur
          le web (pages d&apos;accueil, fiches Google Maps, citations
          publiques). Aucune donnée privée n&apos;est collectée sur les sites
          analysés.
        </p>
        <p className="mt-2 text-slate-700">
          Tes scans sont conservés <strong>12 mois</strong> dans notre base
          (Supabase) pour te permettre de les revoir et de mesurer ta
          progression, puis ils sont supprimés automatiquement. Tu peux
          demander la suppression anticipée à tout moment en nous
          contactant.
        </p>
        <p className="mt-2 text-slate-700">
          Les données qui te concernent (email, identifiant utilisateur) sont
          traitées dans le respect du Règlement Général sur la Protection des
          Données (RGPD).
        </p>

        <h2 className="mt-8 text-xl font-semibold text-slate-900">
          4. Limites d&apos;utilisation
        </h2>
        <p className="mt-2 text-slate-700">
          L&apos;usage de SparkScan est limité à <strong>10 scans par 24
          heures</strong> par utilisateur. Cette limite protège ton budget
          API et garantit la stabilité du service. Tu peux nous contacter
          pour l&apos;augmenter dans le cadre d&apos;un usage professionnel
          plus intensif.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-slate-900">
          5. Fournisseurs tiers
        </h2>
        <p className="mt-2 text-slate-700">
          SparkScan s&apos;appuie sur des services tiers (DataForSEO, Apify,
          Anthropic, Perplexity). En cas d&apos;indisponibilité de l&apos;un
          d&apos;eux, le rapport peut être partiel et un avertissement clair
          sera affiché. L&apos;éditeur n&apos;est pas responsable des
          interruptions de service de ces fournisseurs.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-slate-900">
          6. Modification des conditions
        </h2>
        <p className="mt-2 text-slate-700">
          Ces conditions peuvent évoluer. Toute modification substantielle
          sera notifiée dans le rapport ou par email.
        </p>

        <h2 className="mt-8 text-xl font-semibold text-slate-900">
          7. Contact
        </h2>
        <p className="mt-2 text-slate-700">
          Pour toute question : <a href="mailto:contact@digital-code-growth.com" className="text-violet-700 hover:underline">contact@digital-code-growth.com</a>
        </p>
      </div>
    </div>
  )
}
