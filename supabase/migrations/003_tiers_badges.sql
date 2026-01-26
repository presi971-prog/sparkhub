-- ==============================================
-- SYSTÈME DE TIERS (5 niveaux)
-- ==============================================

INSERT INTO tiers (name, display_name, emoji, max_places, min_rank, discount_percent, monthly_highlights, highlight_duration_months, promo_price, promo_duration_months, regular_price, features) VALUES
('platine', 'Platine', '🏆', 10, 1, 50, 4, 3, 9.00, 12, 39.00,
  '["50% de réduction sur tous les outils", "4 highlights par mois pendant 3 mois", "Accès anticipé aux nouvelles fonctionnalités", "Support prioritaire 24/7", "Badge Platine exclusif", "Visibilité maximale sur la carte"]'::jsonb),

('or', 'Or', '🥇', 30, 11, 25, 2, 3, 9.00, 12, 39.00,
  '["25% de réduction sur tous les outils", "2 highlights par mois pendant 3 mois", "Accès anticipé aux nouvelles fonctionnalités", "Support prioritaire", "Badge Or exclusif", "Bonne visibilité sur la carte"]'::jsonb),

('argent', 'Argent', '🥈', 60, 31, 15, 4, 0, 9.00, 12, 39.00,
  '["15% de réduction sur tous les outils", "4 highlights au total", "Accès aux fonctionnalités standard", "Support standard", "Badge Argent"]'::jsonb),

('bronze', 'Bronze', '🥉', 100, 61, 10, 2, 0, 9.00, 12, 39.00,
  '["10% de réduction sur tous les outils", "2 highlights au total", "Accès aux fonctionnalités standard", "Support standard", "Badge Bronze"]'::jsonb),

('standard', 'Standard', '⭐', 99999, 101, 0, 2, 1, 0.00, 0, 39.00,
  '["Essai gratuit de 7 jours", "2 highlights par mois", "Accès à tous les outils (tarif normal)", "Visibilité sur la carte", "Support standard"]'::jsonb);

-- ==============================================
-- BADGES (20 badges)
-- ==============================================

-- Badges Débutant
INSERT INTO badges (name, description, icon, category, points_reward, condition_type, condition_value) VALUES
('Nouvelle Pousse', 'Bienvenue sur Cobeone Pro ! Votre aventure commence.', '🌱', 'debutant', 10, 'account_created', 1),
('Photogénique', 'Ajoutez une photo de profil professionnelle.', '📸', 'debutant', 15, 'avatar_uploaded', 1),
('Premier Pas', 'Complétez votre première livraison.', '👣', 'debutant', 30, 'deliveries_completed', 1),
('Prêt à Rouler', 'Ajoutez vos documents de véhicule.', '🚗', 'debutant', 20, 'documents_uploaded', 1),
('Zone Définie', 'Définissez vos zones de livraison.', '📍', 'debutant', 15, 'zones_defined', 1);

-- Badges Progression
INSERT INTO badges (name, description, icon, category, points_reward, condition_type, condition_value) VALUES
('Speed Demon', 'Livrez 10 commandes express.', '⚡', 'progression', 50, 'express_deliveries', 10),
('Étoile Montante', 'Obtenez 5 avis 5 étoiles.', '⭐', 'progression', 40, 'five_star_reviews', 5),
('Oiseau de Nuit', 'Effectuez 10 livraisons après 20h.', '🦉', 'progression', 35, 'night_deliveries', 10),
('Fidèle Livreur', 'Soyez actif pendant 30 jours consécutifs.', '📅', 'progression', 60, 'consecutive_days', 30),
('Marathonien', 'Parcourez plus de 500 km en livraison.', '🏃', 'progression', 45, 'total_km', 500);

-- Badges Expert
INSERT INTO badges (name, description, icon, category, points_reward, condition_type, condition_value) VALUES
('Champion du Mois', 'Soyez le livreur #1 du mois.', '🏅', 'expert', 100, 'monthly_top_1', 1),
('Sans Faute', 'Effectuez 50 livraisons sans réclamation.', '✅', 'expert', 75, 'perfect_deliveries', 50),
('Diamant', 'Atteignez le palier Diamant (5000+ points).', '💎', 'expert', 100, 'points_reached', 5000),
('Centurion', 'Complétez 100 livraisons.', '💯', 'expert', 80, 'deliveries_completed', 100),
('Millionnaire', 'Accumulez 1000 points au total.', '🎯', 'expert', 50, 'points_reached', 1000);

-- Badges Spéciaux
INSERT INTO badges (name, description, icon, category, points_reward, condition_type, condition_value) VALUES
('Early Adopter', 'Faites partie des 100 premiers inscrits.', '🚀', 'special', 100, 'rank_number', 100),
('Tour de l''île', 'Livrez dans les 5 zones de Guadeloupe.', '🏝️', 'special', 75, 'zones_covered', 5),
('Hero Local', 'Soyez recommandé 10 fois par des clients.', '🦸', 'special', 60, 'recommendations', 10),
('Ambassadeur', 'Parrainez 5 nouveaux livreurs.', '🤝', 'special', 100, 'referrals', 5),
('Pro Certifié', 'Complétez tous les badges débutant.', '🎖️', 'special', 75, 'beginner_badges_complete', 5);

-- ==============================================
-- RESSOURCES INITIALES (exemples)
-- ==============================================

INSERT INTO ressources (title, description, image_url, url, category, credit_cost, is_active, order_index) VALUES
('Community Manager IA', 'Gérez vos réseaux sociaux automatiquement avec l''IA.', '/images/ressources/cm-ia.png', 'https://tools.cobeone.pro/community-manager', 'marketing', 50, true, 1),
('Création de Visuels', 'Créez des visuels professionnels pour votre activité.', '/images/ressources/visuels.png', 'https://tools.cobeone.pro/visuels', 'marketing', 30, true, 2),
('Montage Vidéo', 'Montez vos vidéos promotionnelles facilement.', '/images/ressources/video.png', 'https://tools.cobeone.pro/video', 'marketing', 75, true, 3),
('Comptabilité Simplifiée', 'Suivez vos revenus et dépenses en un clic.', '/images/ressources/compta.png', 'https://tools.cobeone.pro/comptabilite', 'gestion', 40, true, 4),
('Blog Automatisé', 'Générez du contenu SEO pour votre visibilité.', '/images/ressources/blog.png', 'https://tools.cobeone.pro/blog', 'marketing', 60, true, 5),
('Guide du Livreur', 'Tout ce qu''il faut savoir pour réussir.', '/images/ressources/guide.png', 'https://docs.cobeone.pro/guide', 'formation', 0, true, 6);
