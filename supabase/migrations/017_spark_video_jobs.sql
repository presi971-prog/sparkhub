-- Migration 017: Spark Video Jobs
-- Table de state machine pour le pipeline vidéo multi-étapes

CREATE TABLE IF NOT EXISTS spark_video_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- État de la machine
  status TEXT NOT NULL DEFAULT 'scenes'
    CHECK (status IN (
      'scenes',         -- Gemini génère les prompts de scène
      'images',         -- fal.ai génère les images
      'video_prompts',  -- Gemini génère les prompts vidéo
      'videos',         -- fal.ai génère les clips vidéo
      'music',          -- fal.ai génère la musique
      'montage',        -- ffmpeg-api assemble le tout
      'completed',      -- Terminé
      'error'           -- Erreur
    )),

  -- Inputs utilisateur
  idea TEXT NOT NULL,
  ambiance TEXT,
  music_mood TEXT,
  tier TEXT NOT NULL,
  scenes_count INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL,
  credits_used INTEGER NOT NULL,

  -- Données par étape (JSONB)
  scenes JSONB,           -- [{index, prompt}]
  image_jobs JSONB,       -- [{index, status_url, response_url, image_url, status}]
  video_prompts JSONB,    -- [{index, prompt}]
  video_jobs JSONB,       -- [{index, status_url, response_url, video_url, status}]
  music_job JSONB,        -- {prompt, status_url, response_url, audio_url, status}
  montage_job JSONB,      -- {status_url, response_url, video_url, status}

  -- Résultat final
  final_video_url TEXT,
  error TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour retrouver les jobs d'un utilisateur
CREATE INDEX IF NOT EXISTS idx_spark_video_user
  ON spark_video_jobs(user_id, created_at DESC);

-- Index pour retrouver les jobs actifs
CREATE INDEX IF NOT EXISTS idx_spark_video_active
  ON spark_video_jobs(status) WHERE status NOT IN ('completed', 'error');

-- RLS
ALTER TABLE spark_video_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own spark video jobs"
  ON spark_video_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on spark video jobs"
  ON spark_video_jobs FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_spark_video_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER spark_video_jobs_updated_at
  BEFORE UPDATE ON spark_video_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_spark_video_updated_at();
