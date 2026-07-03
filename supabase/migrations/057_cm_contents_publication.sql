-- Migration 057 : traçage de la publication des contenus content-machine.
--
-- Pourquoi : l'usine quotidienne générait des contenus (cm_contents) qui
-- restaient en attente pour toujours : rien ne les publiait. L'orchestrateur
-- (cron generate-daily) les pousse désormais vers GHL Social Planner en mode
-- programmé. Ces colonnes évitent les doubles publications et gardent la
-- trace des résultats par réseau.

ALTER TABLE cm_contents
  ADD COLUMN IF NOT EXISTS pushed_at timestamptz,
  ADD COLUMN IF NOT EXISTS push_results jsonb;

-- Requête du matin : "les contenus du jour pas encore poussés"
CREATE INDEX IF NOT EXISTS idx_cm_contents_pushed ON cm_contents(pushed_at)
  WHERE pushed_at IS NULL;
