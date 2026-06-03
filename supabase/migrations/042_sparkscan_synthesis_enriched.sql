-- Migration 042 : enrichissement SparkScan V0.5
--
-- Pourquoi : SparkScan ne sort plus une liste brute de domaines mais un
-- VRAI rapport concurrentiel actionnable :
--   - chaque concurrent est qualifié par Claude (direct/indirect/noise)
--   - puis enrichi (positionnement + forces + faiblesses + action tactique)
--   - une synthèse stratégique top liste les 3 priorités + plan de la semaine
--
-- Format synthesis :
-- {
--   "top3_priorities": [
--     { "competitor_key": "amazon.fr", "why_this_one": "...", "action_this_week": "..." }
--   ],
--   "market_overview": "..."
-- }
--
-- Format competitors_enriched : tableau d'objets enrichis
-- (qualifié par qualifier.ts puis enrichi par enricher.ts)

ALTER TABLE sparkscan_scans
  ADD COLUMN IF NOT EXISTS synthesis jsonb,
  ADD COLUMN IF NOT EXISTS competitors_enriched jsonb;
