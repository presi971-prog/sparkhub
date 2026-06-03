-- Migration 040 : table sparkscan_scans pour SparkScan
--
-- Pourquoi : SparkScan est un outil d'enquête concurrentielle qui prend une URL
-- en entrée (+ zone géo + langue) et ressort une liste de concurrents
-- avec analyse multi-canal (SEO, social, GEO IA). On stocke chaque scan
-- pour pouvoir le re-consulter, suivre dans le temps, et exporter pour Claude.
--
-- Cadrage complet du projet : memory/r0-projet-outil-concurrent.md
-- Architecture : Option C (hybride) — SparkScan vit dans cobeone-pro sous
-- /(sparkscan)/sparkscan avec layout custom (sans sidebar Sparkhub).

CREATE TABLE IF NOT EXISTS sparkscan_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Entrées utilisateur
  input_url text NOT NULL,
  zone text NOT NULL,
  niveau_zone text NOT NULL CHECK (niveau_zone IN ('pays', 'region', 'departement', 'ville')),
  langue text NOT NULL DEFAULT 'fr',

  -- Détection maturité site (cadrage R0 : <3 mois OU <10 mots-clés top 20 → 'young')
  -- 'young'  : méthode B (Claude + Apify Google Maps)
  -- 'mature' : méthode A+C (DataForSEO Competitors + SERP Maps)
  -- NULL     : pas encore évalué
  maturity_status text CHECK (maturity_status IN ('young', 'mature') OR maturity_status IS NULL),
  ranked_keywords_count integer,

  -- Résultats (liste de concurrents au format jsonb)
  competitors_found jsonb DEFAULT '[]'::jsonb,
  method_used text CHECK (method_used IN ('A+C', 'B') OR method_used IS NULL),

  -- État du job
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'error')),
  error_message text,

  -- Coût cumulé en USD (DataForSEO + Apify pour ce scan) — pour suivre la conso
  cost_usd numeric(10, 4),

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- Index pour les requêtes utilisateur (lister ses scans, tri chronologique)
CREATE INDEX IF NOT EXISTS sparkscan_scans_user_id_idx ON sparkscan_scans(user_id);
CREATE INDEX IF NOT EXISTS sparkscan_scans_created_at_idx ON sparkscan_scans(created_at DESC);

-- RLS : activer
ALTER TABLE sparkscan_scans ENABLE ROW LEVEL SECURITY;

-- RLS : utilisateur peut lire UNIQUEMENT ses propres scans
DROP POLICY IF EXISTS "Users read own sparkscan_scans" ON sparkscan_scans;
CREATE POLICY "Users read own sparkscan_scans"
  ON sparkscan_scans FOR SELECT
  USING (auth.uid() = user_id);

-- RLS : utilisateur peut créer ses propres scans
DROP POLICY IF EXISTS "Users insert own sparkscan_scans" ON sparkscan_scans;
CREATE POLICY "Users insert own sparkscan_scans"
  ON sparkscan_scans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS : service_role peut tout (pour les workers backend qui appellent DataForSEO/Apify)
DROP POLICY IF EXISTS "Service role full access sparkscan_scans" ON sparkscan_scans;
CREATE POLICY "Service role full access sparkscan_scans"
  ON sparkscan_scans FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
