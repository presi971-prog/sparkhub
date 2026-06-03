-- Migration 045 : analyse Réseaux Sociaux SparkScan (Facebook + Instagram)
--
-- Pourquoi : 4e axe différenciant vs SEMrush.
-- Pour chaque concurrent on collecte (via Apify) ses données FB + IG et
-- on demande à Claude une analyse stratégique courte (fréquence, qualité,
-- engagement, opportunité actionnable).
--
-- L'analyse est portée DANS chaque entrée de competitors_enriched via la clé
-- `social_media` qui contient :
-- {
--   "data": { "facebook": {...} | null, "instagram": {...} | null },
--   "analysis": { "frequency", "dominant_content", "engagement", "opportunity" }
-- }
--
-- Pas besoin de colonne dédiée : tout transit via competitors_enriched (jsonb).
-- Cette migration n'ajoute donc PAS de colonne. Elle existe pour numéroter et
-- documenter la livraison V1.2 (4e axe RS).

-- (Pas d'ALTER TABLE — l'analyse RS est stockée dans competitors_enriched.)
SELECT 1;
