-- Migration 018: Add subject_anchor to spark_video_jobs
-- Stocke la description visuelle du sujet principal pour cohérence entre scènes

ALTER TABLE spark_video_jobs ADD COLUMN IF NOT EXISTS subject_anchor TEXT;
