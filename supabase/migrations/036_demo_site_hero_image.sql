-- Migration 036 : ajout colonne hero_image_url à demo_site_mapping
-- Pour afficher la photo cover du prospect en bannière du mini-site DCG AI
-- (effet "wow" reconnaissance visuelle immédiate)

ALTER TABLE demo_site_mapping
  ADD COLUMN IF NOT EXISTS hero_image_url TEXT;
