-- Migration 016: Mini Sites Vitrine
-- Table pour stocker les sites vitrines des professionnels

CREATE TABLE IF NOT EXISTS mini_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Identite du commerce
  slug TEXT NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  business_type TEXT, -- restaurant, salon, etc.
  slogan TEXT,
  logo_url TEXT,

  -- Offres / Services
  services JSONB DEFAULT '[]'::jsonb,
  -- Format: [{ "name": "Bokit poulet", "price": "5€", "description": "..." }]

  -- Infos pratiques
  phone TEXT,
  email TEXT,
  address TEXT,
  opening_hours JSONB DEFAULT '{}'::jsonb,
  -- Format: { "lundi": "8h-18h", "mardi": "8h-18h", ... }

  -- Galerie photos (jusqu'a 6)
  gallery_urls JSONB DEFAULT '[]'::jsonb,

  -- Reseaux sociaux
  facebook_url TEXT,
  instagram_url TEXT,
  tiktok_url TEXT,
  youtube_url TEXT,
  whatsapp_number TEXT,

  -- Personnalisation visuelle
  theme TEXT NOT NULL DEFAULT 'tropical_creole',
  accent_color TEXT DEFAULT '#E67E22',
  font_style TEXT NOT NULL DEFAULT 'moderne',
  services_layout TEXT NOT NULL DEFAULT 'cards',
  sections_order JSONB DEFAULT '["hero","about","services","gallery","hours","contact","social"]'::jsonb,

  -- Contenu genere par IA
  ai_description TEXT,
  hero_image_url TEXT,

  -- Meta
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour lookup rapide par slug (page publique)
CREATE INDEX IF NOT EXISTS idx_mini_sites_slug ON mini_sites(slug);

-- Index pour retrouver le site d'un utilisateur
CREATE INDEX IF NOT EXISTS idx_mini_sites_profile ON mini_sites(profile_id);

-- RLS
ALTER TABLE mini_sites ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir/modifier leur propre site
CREATE POLICY "Users can view own mini site"
  ON mini_sites FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert own mini site"
  ON mini_sites FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update own mini site"
  ON mini_sites FOR UPDATE
  USING (auth.uid() = profile_id);

-- Acces public pour les sites publies (page /site/[slug])
CREATE POLICY "Anyone can view published mini sites"
  ON mini_sites FOR SELECT
  USING (published = true);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_mini_sites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mini_sites_updated_at
  BEFORE UPDATE ON mini_sites
  FOR EACH ROW
  EXECUTE FUNCTION update_mini_sites_updated_at();
