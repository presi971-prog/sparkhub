-- ============================================================
-- 049 — sparkpilot_tasks.metadata (jsonb)
-- ============================================================
--
-- Ajoute une colonne `metadata` jsonb à sparkpilot_tasks pour stocker
-- la provenance playbook de chaque tâche (framework cité, catégorie,
-- version du playbook). On garde la flexibilité jsonb pour pouvoir
-- enrichir le playbook (V1.5, V2...) sans nouvelle migration.
--
-- Structure attendue dans metadata (cf. SparkpilotTaskMetadata dans
-- src/lib/sparkpilot/types.ts) :
--   {
--     "framework_used":     "Pillar+Cluster" | "StoryBrand" | "GEO" | ...,
--     "playbook_category":  "Visibilité IA" | "Conversion site / page d'accueil"
--                         | "Contenu de fond" | "Présence sociale"
--                         | "Acquisition payante" | "PIVOT_NEEDED",
--     "playbook_version":   "v1.0"
--   }
--
-- Date : 2026-05-30
-- ============================================================

ALTER TABLE sparkpilot_tasks
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN sparkpilot_tasks.metadata IS
  'Provenance playbook (framework_used, playbook_category, playbook_version). Schéma : src/lib/sparkpilot/types.ts → SparkpilotTaskMetadata.';
