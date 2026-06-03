-- Migration 043 : cadrage client persisté dans sparkscan_scans
--
-- Pourquoi : avant chaque scan, l'utilisateur renseigne 3 infos qui
-- calibrent les recommandations de l'IA (objectif / équipe+budget / horizon).
-- On les stocke pour pouvoir : retrouver le scan dans son contexte, faire
-- évoluer le cadrage entre 2 scans, et tracer pourquoi telle reco a été faite.
--
-- Format client_context :
-- {
--   "objective": "acquisition" | "fidelisation" | "differenciation" | "defense",
--   "team_size": "solo" | "2-5" | "5+",
--   "monthly_budget": "under_500" | "500_2000" | "2000_plus",
--   "horizon": "30j" | "90j" | "6m"
-- }

ALTER TABLE sparkscan_scans
  ADD COLUMN IF NOT EXISTS client_context jsonb;
