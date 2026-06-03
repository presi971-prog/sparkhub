-- Migration 046 : SparkScan mode async — colonne progress
--
-- Pourquoi : la route POST /api/sparkscan/analyze devient asynchrone (retourne
-- immédiatement scan_id), le pipeline tourne en background et met à jour la
-- colonne `progress` à chaque étape. L'UI poll GET /status et affiche la
-- progression réelle (au lieu d'attendre 12 min devant un écran figé).
--
-- Format attendu (jsonb) :
-- {
--   "step": "apify_maps",        // code court de l'étape en cours
--   "label": "Recherche Google Maps", // texte affiché en UI
--   "percent": 35,               // % approximatif (0-100)
--   "started_at": "2026-05-29T..." // ISO timestamp début de cette étape
-- }
--
-- L'UI peut afficher : "Étape 3/7 : Recherche Google Maps (35%)".

ALTER TABLE sparkscan_scans
  ADD COLUMN IF NOT EXISTS progress jsonb;
