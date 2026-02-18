-- Migration 019: UGC Video Jobs (Veo 3.1 via n8n)
-- Machine à états simple pour le pipeline vidéo UGC Creator

CREATE TABLE IF NOT EXISTS ugc_video_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- État simple (n8n gère toute la complexité du pipeline)
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN (
      'submitted',    -- Job soumis, webhook n8n appelé
      'processing',   -- n8n a commencé le traitement
      'completed',    -- Vidéo prête
      'error'         -- Erreur (crédits remboursés)
    )),

  -- Inputs utilisateur
  type TEXT NOT NULL,        -- "Produit" ou "Mascotte ou personnage"
  qui TEXT NOT NULL,
  lieu TEXT NOT NULL,
  action TEXT NOT NULL,
  ambiance TEXT NOT NULL,
  image_url TEXT NOT NULL,   -- URL Supabase Storage
  credits_used INTEGER NOT NULL,

  -- Résultat
  video_url TEXT,
  error TEXT,

  -- Token de sécurité pour le callback n8n
  callback_token TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour retrouver les jobs d'un utilisateur
CREATE INDEX IF NOT EXISTS idx_ugc_video_user
  ON ugc_video_jobs(user_id, created_at DESC);

-- Index pour retrouver les jobs actifs
CREATE INDEX IF NOT EXISTS idx_ugc_video_active
  ON ugc_video_jobs(status) WHERE status NOT IN ('completed', 'error');

-- RLS
ALTER TABLE ugc_video_jobs ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs voient leurs propres jobs
CREATE POLICY "Users can view own ugc video jobs"
  ON ugc_video_jobs FOR SELECT
  USING (auth.uid() = user_id);

-- Service role a accès complet (pour le callback API et generate)
CREATE POLICY "Service role full access on ugc video jobs"
  ON ugc_video_jobs FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_ugc_video_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ugc_video_jobs_updated_at
  BEFORE UPDATE ON ugc_video_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_ugc_video_updated_at();

-- ============================================
-- Bucket Storage pour les images UGC uploadées
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ugc-videos',
  'ugc-videos',
  true,
  10485760,  -- 10 Mo
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Les utilisateurs authentifiés peuvent uploader dans leur dossier
CREATE POLICY "Users can upload ugc images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ugc-videos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Lecture publique (n8n doit accéder à l'image)
CREATE POLICY "Public read access for ugc-videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'ugc-videos');

-- Suppression par le propriétaire
CREATE POLICY "Users can delete their own ugc images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'ugc-videos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
