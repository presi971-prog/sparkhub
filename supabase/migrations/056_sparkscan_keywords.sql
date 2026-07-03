-- Migration 056 : table sparkscan_keywords — le rank tracking de SparkScan.
--
-- Pourquoi : jusqu'ici un scan ne gardait qu'un COMPTEUR de mots-clés
-- (ranked_keywords_count). Impossible de dire "tu es passé de la 12e à la
-- 7e place sur X". On stocke désormais, à chaque scan, les mots-clés du
-- site cible avec leur position Google (top 20, DataForSEO ranked_keywords).
-- La page Suivi (SparkPilot) compare ensuite scan N vs scan N-1.
--
-- Une ligne = (scan, mot-clé). L'historique vient du lien scan_id →
-- sparkscan_scans.created_at : pas de colonne date dupliquée.

CREATE TABLE IF NOT EXISTS sparkscan_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid NOT NULL REFERENCES sparkscan_scans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  keyword text NOT NULL,
  -- Position Google (rank_group DataForSEO, 1 = première place)
  position integer NOT NULL,
  -- Volume de recherche mensuel estimé (peut être NULL si non fourni)
  search_volume integer,
  -- URL de la page du site qui ranke sur ce mot-clé
  ranked_url text,

  created_at timestamptz NOT NULL DEFAULT now(),

  -- Un mot-clé ne peut apparaître qu'une fois par scan
  UNIQUE (scan_id, keyword)
);

CREATE INDEX IF NOT EXISTS sparkscan_keywords_scan_id_idx ON sparkscan_keywords(scan_id);
CREATE INDEX IF NOT EXISTS sparkscan_keywords_user_id_idx ON sparkscan_keywords(user_id);

-- RLS : même modèle que sparkscan_scans
ALTER TABLE sparkscan_keywords ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own sparkscan_keywords" ON sparkscan_keywords;
CREATE POLICY "Users read own sparkscan_keywords"
  ON sparkscan_keywords FOR SELECT
  USING (auth.uid() = user_id);

-- L'écriture passe uniquement par le worker backend (service_role)
DROP POLICY IF EXISTS "Service role full access sparkscan_keywords" ON sparkscan_keywords;
CREATE POLICY "Service role full access sparkscan_keywords"
  ON sparkscan_keywords FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
