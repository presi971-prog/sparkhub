-- Migration 041 : ajoute site_analysis (jsonb) à sparkscan_scans
--
-- Pourquoi : la méthode B (sites jeunes) génère une analyse sémantique
-- du site via Claude (nom de l'entreprise, secteur, services, 8 requêtes
-- de recherche Google Maps). On la stocke pour pouvoir l'afficher dans
-- le rapport et la rejouer sans re-payer un appel Claude.
--
-- Format attendu :
-- {
--   "business_name": "...",
--   "sector": "...",
--   "services": ["..."],
--   "location_text": "...",
--   "search_categories": ["...", "..."]
-- }

ALTER TABLE sparkscan_scans
  ADD COLUMN IF NOT EXISTS site_analysis jsonb;
