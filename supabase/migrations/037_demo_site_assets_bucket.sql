-- Migration 037 : bucket Supabase Storage pour les images permanentes des
-- mini-sites DCG AI (logos, photos hero récupérés via Apify Instagram).
--
-- Pourquoi : les CDN Instagram (scontent.cdninstagram.com) signent leurs URLs
-- avec une expiration courte (quelques heures), donc on doit ré-héberger
-- les images chez nous pour qu'elles restent dispos quand le prospect
-- ouvre le mini-site plus tard.

-- Crée le bucket public (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('demo-site-assets', 'demo-site-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Politique RLS : tout le monde peut LIRE (les images servent un mini-site
-- public).
DROP POLICY IF EXISTS "Public read demo-site-assets" ON storage.objects;
CREATE POLICY "Public read demo-site-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'demo-site-assets');

-- Politique RLS : seul le service_role (Smart Crawler côté serveur Vercel)
-- peut UPLOADER. Les utilisateurs anonymes ne peuvent pas écrire.
DROP POLICY IF EXISTS "Service role write demo-site-assets" ON storage.objects;
CREATE POLICY "Service role write demo-site-assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'demo-site-assets' AND auth.role() = 'service_role');

-- Politique RLS : service_role peut aussi UPDATE (upsert: true côté code)
DROP POLICY IF EXISTS "Service role update demo-site-assets" ON storage.objects;
CREATE POLICY "Service role update demo-site-assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'demo-site-assets' AND auth.role() = 'service_role');
