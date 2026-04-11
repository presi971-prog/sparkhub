-- ============================================================================
-- Migration 023 — Spark Compta : seed des 86 catégories (6 familles)
-- ============================================================================
-- Description : Insertion des catégories fermées pour les 6 familles métiers
-- selon le cahier des charges FORGE (sections 8.2 à 8.7).
-- Auteur      : Phase 2 Setup Infra — 11 avril 2026
-- ============================================================================

-- ----------------------------------------------------------------------------
-- FAMILLE 1 : ROULEURS (livreur, taxi, VTC, coursier)
-- ----------------------------------------------------------------------------
-- Dépenses (8)
INSERT INTO public.spark_compta_categories (code, family, type, label_fr, icon_emoji, fiscal_nature, pcg_mapping, display_order) VALUES
  ('rouleur_carburant',       'rouleur', 'depense', 'Carburant',                    '⛽', 'deductible_100',     '606100', 10),
  ('rouleur_peage_parking',   'rouleur', 'depense', 'Péages & parking',             '🛣️', 'deductible_100',     '625110', 20),
  ('rouleur_entretien',       'rouleur', 'depense', 'Entretien véhicule',           '🔧', 'deductible_100',     '615500', 30),
  ('rouleur_assurance',       'rouleur', 'depense', 'Assurance véhicule',           '🛡️', 'deductible_100',     '616100', 40),
  ('rouleur_repas',           'rouleur', 'depense', 'Repas route',                  '🍔', 'deductible_partiel', '625700', 50),
  ('rouleur_telephone',       'rouleur', 'depense', 'Téléphone & forfait',          '📱', 'deductible_partiel', '626100', 60),
  ('rouleur_equipement',      'rouleur', 'depense', 'Équipement (casque, sacoche)', '🛵', 'investissement',     '215400', 70),
  ('rouleur_divers_dep',      'rouleur', 'depense', 'Divers',                       '📦', 'a_classer',           NULL,    99);

-- Recettes (6)
INSERT INTO public.spark_compta_categories (code, family, type, label_fr, icon_emoji, fiscal_nature, pcg_mapping, display_order) VALUES
  ('rouleur_course_cobeone',  'rouleur', 'recette', 'Course Cobeone',               '🛵', 'ca_imposable',        '706000', 10),
  ('rouleur_course_plateforme','rouleur','recette', 'Course plateforme externe',    '🍕', 'ca_imposable',        '706000', 20),
  ('rouleur_course_directe',  'rouleur', 'recette', 'Course directe',               '🚕', 'ca_imposable',        '706000', 30),
  ('rouleur_pourboire',       'rouleur', 'recette', 'Pourboire',                    '🎁', 'imposable_sans_tva',  '758000', 40),
  ('rouleur_facture_direct',  'rouleur', 'recette', 'Facture client direct',        '💼', 'ca_imposable',        '706000', 50),
  ('rouleur_divers_rec',      'rouleur', 'recette', 'Divers',                       '💰', 'a_classer',           NULL,    99);

-- ----------------------------------------------------------------------------
-- FAMILLE 2 : MAINS AGILES (artisans)
-- ----------------------------------------------------------------------------
-- Dépenses (8)
INSERT INTO public.spark_compta_categories (code, family, type, label_fr, icon_emoji, fiscal_nature, pcg_mapping, display_order) VALUES
  ('mains_materiel_chantier', 'mains_agiles', 'depense', 'Matériel de chantier',    '🧱', 'deductible_100', '601000', 10),
  ('mains_outillage',         'mains_agiles', 'depense', 'Outillage (investissement)', '🛠️', 'investissement', '215400', 20),
  ('mains_vehicule_util',     'mains_agiles', 'depense', 'Véhicule utilitaire',     '🚚', 'deductible_100', '606100', 30),
  ('mains_sous_traitance',    'mains_agiles', 'depense', 'Sous-traitance',          '👷', 'deductible_100', '611000', 40),
  ('mains_local_atelier',     'mains_agiles', 'depense', 'Local / atelier',         '🏠', 'deductible_100', '613200', 50),
  ('mains_assurances_pro',    'mains_agiles', 'depense', 'Assurances pro (décennale, RC)', '🛡️', 'deductible_100', '616100', 60),
  ('mains_frais_pro',         'mains_agiles', 'depense', 'Frais pro (compta, téléphone, CM)', '📚', 'deductible_100', '622600', 70),
  ('mains_divers_dep',        'mains_agiles', 'depense', 'Divers',                   '📦', 'a_classer', NULL, 99);

-- Recettes (6)
INSERT INTO public.spark_compta_categories (code, family, type, label_fr, icon_emoji, fiscal_nature, pcg_mapping, display_order) VALUES
  ('mains_acompte_chantier',  'mains_agiles', 'recette', 'Acompte chantier',        '📝', 'ca_imposable', '706000', 10),
  ('mains_facture_chantier',  'mains_agiles', 'recette', 'Facture chantier',        '🏗️', 'ca_imposable', '706000', 20),
  ('mains_depannage',         'mains_agiles', 'recette', 'Dépannage / petits travaux', '🔧', 'ca_imposable', '706100', 30),
  ('mains_sous_traitance_rec','mains_agiles', 'recette', 'Sous-traitance reçue',    '💼', 'ca_imposable', '706000', 40),
  ('mains_vente_materiel',    'mains_agiles', 'recette', 'Vente de matériel',       '📑', 'ca_imposable', '707000', 50),
  ('mains_divers_rec',        'mains_agiles', 'recette', 'Divers',                   '💰', 'a_classer', NULL, 99);

-- ----------------------------------------------------------------------------
-- FAMILLE 3 : TENANCIERS (restaurants, commerces, coiffeurs) — 12 dépenses (exception)
-- ----------------------------------------------------------------------------
-- Dépenses (12)
INSERT INTO public.spark_compta_categories (code, family, type, label_fr, icon_emoji, fiscal_nature, pcg_mapping, display_order) VALUES
  ('tenancier_achats_matieres',   'tenancier', 'depense', 'Achats matières',          '🥬', 'deductible_100', '607100', 10),
  ('tenancier_loyer',             'tenancier', 'depense', 'Loyer local',              '🏠', 'deductible_100', '613200', 20),
  ('tenancier_energie',           'tenancier', 'depense', 'Énergie & eau',            '⚡', 'deductible_100', '606100', 30),
  ('tenancier_salaires',          'tenancier', 'depense', 'Salaires + charges',       '💼', 'deductible_100', '641000', 40),
  ('tenancier_extras',            'tenancier', 'depense', 'Extras / intérim',         '👷', 'deductible_100', '621100', 50),
  ('tenancier_assurances',        'tenancier', 'depense', 'Assurances',               '🛡️', 'deductible_100', '616100', 60),
  ('tenancier_equipement',        'tenancier', 'depense', 'Matériel & équipement',    '🍳', 'investissement', '215400', 70),
  ('tenancier_entretien',         'tenancier', 'depense', 'Entretien & ménage',       '🧽', 'deductible_100', '615200', 80),
  ('tenancier_marketing',         'tenancier', 'depense', 'Marketing & communication','📣', 'deductible_100', '623000', 90),
  ('tenancier_frais_pro',         'tenancier', 'depense', 'Frais pro (compta, banque)', '📚', 'deductible_100', '622600', 100),
  ('tenancier_transport',         'tenancier', 'depense', 'Transport & livraison',    '🚚', 'deductible_100', '624100', 110),
  ('tenancier_divers_dep',        'tenancier', 'depense', 'Divers',                   '📦', 'a_classer', NULL, 120);

-- Recettes (6)
INSERT INTO public.spark_compta_categories (code, family, type, label_fr, icon_emoji, fiscal_nature, pcg_mapping, display_order) VALUES
  ('tenancier_vente_place',       'tenancier', 'recette', 'Vente sur place (ticket Z)', '🍽️', 'ca_imposable', '707000', 10),
  ('tenancier_vente_emporter',    'tenancier', 'recette', 'Vente à emporter',         '🥡', 'ca_imposable', '707100', 20),
  ('tenancier_plateformes',       'tenancier', 'recette', 'Plateformes tiers (Uber Eats…)', '🚀', 'ca_imposable', '707200', 30),
  ('tenancier_evenements',        'tenancier', 'recette', 'Événements / privatisations', '🎉', 'ca_imposable', '708000', 40),
  ('tenancier_pourboire',         'tenancier', 'recette', 'Pourboire',                '🎁', 'imposable_sans_tva', '758000', 50),
  ('tenancier_divers_rec',        'tenancier', 'recette', 'Divers',                   '💰', 'a_classer', NULL, 99);

-- ----------------------------------------------------------------------------
-- FAMILLE 4 : VENDEURS DE CERVEAU (formateur, consultant, coach pro)
-- ----------------------------------------------------------------------------
-- Dépenses (8)
INSERT INTO public.spark_compta_categories (code, family, type, label_fr, icon_emoji, fiscal_nature, pcg_mapping, display_order) VALUES
  ('cerveau_deplacements',        'cerveau', 'depense', 'Déplacements pro',          '🚄', 'deductible_100',     '625100', 10),
  ('cerveau_hebergement',         'cerveau', 'depense', 'Hébergement mission',       '🏨', 'deductible_100',     '625600', 20),
  ('cerveau_repas',               'cerveau', 'depense', 'Repas pro',                 '🍽️', 'deductible_partiel', '625700', 30),
  ('cerveau_outils_abo',          'cerveau', 'depense', 'Outils & abonnements',      '💻', 'deductible_100',     '626100', 40),
  ('cerveau_coworking',           'cerveau', 'depense', 'Local / co-working',        '🏫', 'deductible_100',     '613200', 50),
  ('cerveau_marketing',           'cerveau', 'depense', 'Marketing',                 '📣', 'deductible_100',     '623000', 60),
  ('cerveau_cotisations',         'cerveau', 'depense', 'Cotisations & assurances pro', '🛡️', 'deductible_100', '616100', 70),
  ('cerveau_divers_dep',          'cerveau', 'depense', 'Divers',                    '📦', 'a_classer', NULL, 99);

-- Recettes (5)
INSERT INTO public.spark_compta_categories (code, family, type, label_fr, icon_emoji, fiscal_nature, pcg_mapping, display_order) VALUES
  ('cerveau_mission_jour',        'cerveau', 'recette', 'Mission au temps passé',    '💼', 'ca_imposable', '706000', 10),
  ('cerveau_mission_forfait',     'cerveau', 'recette', 'Mission au forfait',        '📦', 'ca_imposable', '706000', 20),
  ('cerveau_formation_opco',      'cerveau', 'recette', 'Formation OPCO / CPF',      '🎓', 'ca_imposable', '706100', 30),
  ('cerveau_droits_auteur',       'cerveau', 'recette', 'Droits d''auteur / royalties', '📝', 'ca_imposable', '751000', 40),
  ('cerveau_divers_rec',          'cerveau', 'recette', 'Divers',                    '💰', 'a_classer', NULL, 99);

-- ----------------------------------------------------------------------------
-- FAMILLE 5 : CRÉATIFS (photographe, vidéaste, artiste)
-- ----------------------------------------------------------------------------
-- Dépenses (8)
INSERT INTO public.spark_compta_categories (code, family, type, label_fr, icon_emoji, fiscal_nature, pcg_mapping, display_order) VALUES
  ('creatif_materiel',            'creatif', 'depense', 'Matériel & équipement',     '📸', 'investissement', '215400', 10),
  ('creatif_logiciels',           'creatif', 'depense', 'Logiciels & licences',      '💻', 'deductible_100', '651600', 20),
  ('creatif_location_materiel',   'creatif', 'depense', 'Location matériel',         '🎬', 'deductible_100', '613500', 30),
  ('creatif_studio',              'creatif', 'depense', 'Studio / local',            '🏠', 'deductible_100', '613200', 40),
  ('creatif_deplacements',        'creatif', 'depense', 'Déplacements pro',          '🚚', 'deductible_100', '625100', 50),
  ('creatif_marketing',           'creatif', 'depense', 'Marketing & portfolio',     '📣', 'deductible_100', '623000', 60),
  ('creatif_cotisations',         'creatif', 'depense', 'Cotisations & assurances (Maison des Artistes…)', '🛡️', 'deductible_100', '616100', 70),
  ('creatif_divers_dep',          'creatif', 'depense', 'Divers',                    '📦', 'a_classer', NULL, 99);

-- Recettes (6)
INSERT INTO public.spark_compta_categories (code, family, type, label_fr, icon_emoji, fiscal_nature, pcg_mapping, display_order) VALUES
  ('creatif_prestation_b2c',      'creatif', 'recette', 'Prestation B2C',            '👰', 'ca_imposable', '706000', 10),
  ('creatif_prestation_b2b',      'creatif', 'recette', 'Prestation B2B',            '🏢', 'ca_imposable', '706100', 20),
  ('creatif_vente_tirages',       'creatif', 'recette', 'Vente tirages / œuvres',    '🖼️', 'ca_imposable', '707000', 30),
  ('creatif_droits_auteur',       'creatif', 'recette', 'Droits d''auteur / royalties', '🎨', 'ca_imposable', '751000', 40),
  ('creatif_workshops',           'creatif', 'recette', 'Cours / workshops',         '🎓', 'ca_imposable', '706200', 50),
  ('creatif_divers_rec',          'creatif', 'recette', 'Divers',                    '💰', 'a_classer', NULL, 99);

-- ----------------------------------------------------------------------------
-- FAMILLE 6 : HÉBERGEURS (location saisonnière, gîte, chambre d'hôte)
-- ----------------------------------------------------------------------------
-- Dépenses (8)
INSERT INTO public.spark_compta_categories (code, family, type, label_fr, icon_emoji, fiscal_nature, pcg_mapping, display_order) VALUES
  ('hebergeur_loyer_credit',      'hebergeur', 'depense', 'Loyer / crédit / taxe foncière', '🏠', 'deductible_partiel', '613200', 10),
  ('hebergeur_energie',           'hebergeur', 'depense', 'Énergie & eau',           '⚡', 'deductible_100', '606100', 20),
  ('hebergeur_menage',            'hebergeur', 'depense', 'Ménage & entretien',      '🧽', 'deductible_100', '615200', 30),
  ('hebergeur_linge',             'hebergeur', 'depense', 'Linge & consommables',    '🛏️', 'deductible_100', '606300', 40),
  ('hebergeur_equipement',        'hebergeur', 'depense', 'Équipement & ameublement','🛋️', 'investissement', '215400', 50),
  ('hebergeur_assurances',        'hebergeur', 'depense', 'Assurances & cotisations','🛡️', 'deductible_100', '616100', 60),
  ('hebergeur_commissions',       'hebergeur', 'depense', 'Commissions plateformes (Airbnb…)', '💼', 'deductible_100', '622200', 70),
  ('hebergeur_divers_dep',        'hebergeur', 'depense', 'Divers',                  '📦', 'a_classer', NULL, 99);

-- Recettes (5)
INSERT INTO public.spark_compta_categories (code, family, type, label_fr, icon_emoji, fiscal_nature, pcg_mapping, display_order) VALUES
  ('hebergeur_airbnb',            'hebergeur', 'recette', 'Recettes Airbnb',         '🏡', 'ca_imposable', '706000', 10),
  ('hebergeur_booking',           'hebergeur', 'recette', 'Recettes Booking / autres plateformes', '🏨', 'ca_imposable', '706100', 20),
  ('hebergeur_direct',            'hebergeur', 'recette', 'Recettes direct',         '💳', 'ca_imposable', '706200', 30),
  ('hebergeur_services',          'hebergeur', 'recette', 'Services additionnels',   '🧽', 'ca_imposable', '708000', 40),
  ('hebergeur_divers_rec',        'hebergeur', 'recette', 'Divers',                  '💰', 'a_classer', NULL, 99);

-- Total inséré : 52 dépenses + 34 recettes = 86 catégories
