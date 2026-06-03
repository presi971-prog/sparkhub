-- Migration 044 : axes Blog + Citations IA persistés dans sparkscan_scans
--
-- Pourquoi : 2 nouveaux axes d'analyse pour battre SEMrush :
--   - Blog : stratégie de contenu détectée par concurrent (intégrée dans
--     competitors_enriched, pas de colonne séparée)
--   - GEO / Citations IA : visibilité du site cible + concurrents dans
--     les réponses de Perplexity (et autres IA à terme)
--
-- Format geo_citations :
-- {
--   "questions_asked": ["..."],
--   "visibility": [{ "domain", "label", "mentions", "questions_appeared_in",
--                    "visibility_score", "rank" }],
--   "insights": "..."
-- }
--
-- NB : l'analyse blog est portée DANS chaque entrée de competitors_enriched
-- via la clé `blog`. Pas besoin de colonne dédiée.

ALTER TABLE sparkscan_scans
  ADD COLUMN IF NOT EXISTS geo_citations jsonb;
