-- ============================================================
-- 020_content_machine.sql
-- Content Machine : génération automatique de contenus réseaux
-- sociaux pour les marques Cobeone et DCG AI
-- ============================================================

-- ============================================================
-- 1. TABLE cm_brands — Marques
-- ============================================================
CREATE TABLE IF NOT EXISTS cm_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  tone text NOT NULL,
  colors jsonb,
  logo_url text,
  target_audience text,
  key_arguments text[],
  rules text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 2. TABLE cm_calendar — Calendrier éditorial
-- ============================================================
CREATE TABLE IF NOT EXISTS cm_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES cm_brands(id) ON DELETE CASCADE,
  date date NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('post_image', 'carousel', 'video')),
  theme text NOT NULL,
  status text DEFAULT 'planned' CHECK (status IN ('planned', 'generating', 'generated', 'failed')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(brand_id, date)
);

-- ============================================================
-- 3. TABLE cm_contents — Contenus générés
-- ============================================================
CREATE TABLE IF NOT EXISTS cm_contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id uuid REFERENCES cm_calendar(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES cm_brands(id) ON DELETE CASCADE,
  content_type text NOT NULL,
  text_content text,
  text_prompt text,
  image_prompts text[],
  video_script text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'modified', 'rejected', 'regenerating')),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- 4. TABLE cm_assets — Fichiers média générés
-- ============================================================
CREATE TABLE IF NOT EXISTS cm_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES cm_contents(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('image', 'carousel_slide', 'video', 'voiceover', 'music')),
  storage_path text NOT NULL,
  public_url text,
  prompt text,
  position int DEFAULT 0,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 5. INDEX utiles
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_cm_calendar_brand_date ON cm_calendar(brand_id, date);
CREATE INDEX IF NOT EXISTS idx_cm_calendar_status ON cm_calendar(status);
CREATE INDEX IF NOT EXISTS idx_cm_contents_calendar ON cm_contents(calendar_id);
CREATE INDEX IF NOT EXISTS idx_cm_contents_brand ON cm_contents(brand_id);
CREATE INDEX IF NOT EXISTS idx_cm_contents_status ON cm_contents(status);
CREATE INDEX IF NOT EXISTS idx_cm_assets_content ON cm_assets(content_id);

-- ============================================================
-- 6. TRIGGER updated_at sur cm_contents
-- ============================================================
CREATE OR REPLACE FUNCTION cm_update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cm_contents_updated_at
  BEFORE UPDATE ON cm_contents
  FOR EACH ROW
  EXECUTE FUNCTION cm_update_updated_at();

-- ============================================================
-- 7. RLS — Row Level Security
-- ============================================================
ALTER TABLE cm_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE cm_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE cm_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE cm_assets ENABLE ROW LEVEL SECURITY;

-- Politique : accès complet pour dcgcobeone@gmail.com ou *@trival-faulech.*
CREATE POLICY cm_brands_admin ON cm_brands
  FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'dcgcobeone@gmail.com'
    OR auth.jwt() ->> 'email' LIKE '%trival-faulech%'
  )
  WITH CHECK (
    auth.jwt() ->> 'email' = 'dcgcobeone@gmail.com'
    OR auth.jwt() ->> 'email' LIKE '%trival-faulech%'
  );

CREATE POLICY cm_calendar_admin ON cm_calendar
  FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'dcgcobeone@gmail.com'
    OR auth.jwt() ->> 'email' LIKE '%trival-faulech%'
  )
  WITH CHECK (
    auth.jwt() ->> 'email' = 'dcgcobeone@gmail.com'
    OR auth.jwt() ->> 'email' LIKE '%trival-faulech%'
  );

CREATE POLICY cm_contents_admin ON cm_contents
  FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'dcgcobeone@gmail.com'
    OR auth.jwt() ->> 'email' LIKE '%trival-faulech%'
  )
  WITH CHECK (
    auth.jwt() ->> 'email' = 'dcgcobeone@gmail.com'
    OR auth.jwt() ->> 'email' LIKE '%trival-faulech%'
  );

CREATE POLICY cm_assets_admin ON cm_assets
  FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'dcgcobeone@gmail.com'
    OR auth.jwt() ->> 'email' LIKE '%trival-faulech%'
  )
  WITH CHECK (
    auth.jwt() ->> 'email' = 'dcgcobeone@gmail.com'
    OR auth.jwt() ->> 'email' LIKE '%trival-faulech%'
  );

-- ============================================================
-- 8. STORAGE BUCKET
-- Le bucket Supabase Storage ne peut pas être créé via SQL pur.
-- → Créer manuellement dans le dashboard Supabase :
--   Nom : content-machine
--   Public : false (les URLs signées seront utilisées)
--   Allowed MIME : image/*, video/*, audio/*
--   Max file size : 50 MB
-- ============================================================

-- Tentative via insert direct (fonctionne sur certaines versions)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'content-machine',
  'content-machine',
  false,
  52428800, -- 50 MB
  ARRAY['image/*', 'video/*', 'audio/*']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 9. DONNÉES INITIALES — 2 marques
-- ============================================================
INSERT INTO cm_brands (name, slug, tone, colors, target_audience, key_arguments, rules)
VALUES
  (
    'Cobeone',
    'cobeone',
    'tutoiement, chaleureux, enthousiaste, direct',
    '{"primary": "#FF6B35", "secondary": "#000000"}'::jsonb,
    'pros de services et commerces en Guadeloupe',
    ARRAY[
      'inscription gratuite',
      'commission 15% la plus basse',
      '0% premier mois early adopters',
      'parrainage'
    ],
    'PAS de détails MLM, PAS de prix DCG AI, PAS de mentions techniques'
  ),
  (
    'DCG AI',
    'dcg-ai',
    'professionnel mais accessible, pas de jargon technique',
    '{"primary": "#3B82F6", "secondary": "#8B5CF6"}'::jsonb,
    'commerçants qui ratent des appels, pas de site web, veulent se digitaliser',
    ARRAY[
      'démo gratuite agent vocal',
      'chatbot IA 24/7',
      'SparkHub mini-site et posts',
      'essai à 1€'
    ],
    'PAS de jargon technique, PAS de termes anglais sans explication'
  )
ON CONFLICT (slug) DO NOTHING;
