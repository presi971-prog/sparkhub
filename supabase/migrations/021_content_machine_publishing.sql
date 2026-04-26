-- ============================================================
-- 021_content_machine_publishing.sql
-- Ajoute les champs de publication Meta (Facebook + Instagram)
-- ============================================================

-- 1. Colonnes de tracking publication
ALTER TABLE cm_contents
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS fb_post_id text,
  ADD COLUMN IF NOT EXISTS ig_post_id text,
  ADD COLUMN IF NOT EXISTS publish_error text;

-- 2. Etendre le check status pour accepter 'published' et 'publishing'
ALTER TABLE cm_contents DROP CONSTRAINT IF EXISTS cm_contents_status_check;
ALTER TABLE cm_contents
  ADD CONSTRAINT cm_contents_status_check
  CHECK (status IN ('pending', 'approved', 'modified', 'rejected', 'regenerating', 'publishing', 'published', 'publish_failed'));

-- 3. Index sur published_at pour filtrer rapidement les publications
CREATE INDEX IF NOT EXISTS idx_cm_contents_published ON cm_contents(published_at) WHERE published_at IS NOT NULL;
