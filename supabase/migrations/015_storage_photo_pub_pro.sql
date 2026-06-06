-- Créer le bucket Storage pour les photos Post Réseaux Sociaux
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photo-pub-pro',
  'photo-pub-pro',
  true,
  10485760,  -- 10 Mo
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Politique : les utilisateurs authentifiés peuvent uploader dans leur dossier
CREATE POLICY "Users can upload their own photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'photo-pub-pro'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Politique : lecture publique (pour getPublicUrl)
CREATE POLICY "Public read access for photo-pub-pro"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'photo-pub-pro');

-- Politique : les utilisateurs peuvent supprimer leurs propres photos
CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'photo-pub-pro'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
