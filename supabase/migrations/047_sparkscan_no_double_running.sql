-- Migration 047 : protection anti race-condition SparkScan
--
-- Bug avant ce fix : si un user clique 2× rapidement sur "Analyser" pour la
-- même URL/zone, le cache check passe à NULL deux fois (la 1ère INSERT n'a pas
-- encore propagé pour la 2e requête), et on insère DEUX scans en running →
-- deux pipelines lancés en parallèle → double facture (Apify, Claude, etc.).
--
-- Solution : index UNIQUE PARTIEL — au plus 1 scan running par (user, url,
-- zone, niveau_zone, langue) en même temps. Les scans completed/error ne sont
-- PAS concernés (le user peut relancer normalement après).
--
-- Côté code : src/lib/sparkscan/competitors.ts:checkCacheOrInsertScan attrape
-- l'erreur 23505 (unique_violation) et récupère le scan running existant.

-- ÉTAPE 1 — Nettoyer les scans 'running' obsolètes AVANT de créer l'index.
--
-- Cas couverts :
--   (a) doublons accidentels : même tuple (user, url, zone, niveau, langue)
--       avec plusieurs scans en running → on garde le plus récent, on marque
--       les autres en error.
--   (b) scans running orphelins (crash dev, restart serveur) de plus de 30 min :
--       on les marque en error pour qu'ils n'apparaissent plus comme actifs.

-- (a) Marque en error tous les scans running qui NE sont PAS le plus récent
-- pour leur tuple.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, input_url, zone, niveau_zone, langue
           ORDER BY created_at DESC
         ) AS rn
  FROM sparkscan_scans
  WHERE status = 'running'
)
UPDATE sparkscan_scans
SET status = 'error',
    error_message = COALESCE(error_message, 'Scan abandonné lors du nettoyage avant migration 047'),
    completed_at = NOW()
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- (b) Marque en error les scans running de plus de 30 min (probables crashs).
UPDATE sparkscan_scans
SET status = 'error',
    error_message = COALESCE(error_message, 'Scan timeout (>30min) lors du nettoyage 047'),
    completed_at = NOW()
WHERE status = 'running'
  AND created_at < NOW() - INTERVAL '30 minutes';

-- ÉTAPE 2 — Crée l'index UNIQUE partiel maintenant que la base est propre.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_sparkscan_running
  ON sparkscan_scans (user_id, input_url, zone, niveau_zone, langue)
  WHERE status = 'running';
