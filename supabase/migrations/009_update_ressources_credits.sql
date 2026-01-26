-- ==============================================
-- MISE À JOUR DES RESSOURCES
-- - Ajout colonne "details" pour description longue
-- - Reset des crédits (à définir manuellement via admin)
--
-- Tarifs recommandés :
--   Texte : 2 crédits
--   Photo Standard : 3 crédits
--   Photo Pro 4K : 10 crédits
--   Vidéo Kling 5s : 5 crédits
--   Vidéo Hailuo 5s : 15 crédits
--   Vidéo Sora 5s : 30 crédits
--   Vidéo Veo 3 5s : 60 crédits
--   Vidéo Sora Pro 5s : 80 crédits
--   Vidéo Veo 3 + Audio : 100 crédits
-- ==============================================

-- Ajouter la colonne details si elle n'existe pas
ALTER TABLE ressources ADD COLUMN IF NOT EXISTS details TEXT;

-- Réinitialiser tous les crédits à 0 par défaut
-- (vous pouvez les définir manuellement via l'interface admin)
UPDATE ressources SET credit_cost = 0;
