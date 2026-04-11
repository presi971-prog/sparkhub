-- ============================================================================
-- Migration 030 — Spark Compta : seed des paramètres fiscaux 2026
-- ============================================================================
-- Description : Plafonds, taux TVA, seuils fiscaux pour l'année 2026.
-- À mettre à jour chaque année par une nouvelle migration.
-- Auteur      : Phase 2 Setup Infra — 11 avril 2026
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Plafonds micro-entrepreneurs 2026
-- ----------------------------------------------------------------------------
INSERT INTO public.spark_compta_fiscal_parameters (parameter_key, year, region, value_numeric, description, source_url) VALUES
  ('micro_bic_plafond_ventes',     2026, 'metropole', 188700, 'Plafond micro-BIC ventes marchandises 2026 (€)', 'https://www.impots.gouv.fr/'),
  ('micro_bic_plafond_services',   2026, 'metropole', 77700,  'Plafond micro-BIC prestations de services 2026 (€)', 'https://www.impots.gouv.fr/'),
  ('micro_bnc_plafond',            2026, 'metropole', 77700,  'Plafond micro-BNC 2026 (€)', 'https://www.impots.gouv.fr/'),
  ('franchise_tva_plafond_services', 2026, 'metropole', 36800, 'Plafond franchise en base TVA services 2026 (€)', 'https://www.impots.gouv.fr/');

-- ----------------------------------------------------------------------------
-- Plafonds de déduction — dépenses pro
-- ----------------------------------------------------------------------------
INSERT INTO public.spark_compta_fiscal_parameters (parameter_key, year, region, value_numeric, description) VALUES
  ('repas_plafond_deductible_unitaire',         2026, 'metropole', 19.10, 'Plafond déductible par repas pro 2026 (€)'),
  ('vehicule_amortissement_plafond_co2_20',     2026, 'metropole', 30000, 'Plafond amortissement véhicule ≤ 20 g CO2/km (€ HT)'),
  ('vehicule_amortissement_plafond_co2_155',    2026, 'metropole', 18300, 'Plafond amortissement véhicule 20-155 g CO2/km (€ HT)'),
  ('vehicule_amortissement_plafond_co2_sup155', 2026, 'metropole', 9900,  'Plafond amortissement véhicule > 155 g CO2/km (€ HT)');

-- ----------------------------------------------------------------------------
-- Taux de TVA métropole 2026
-- ----------------------------------------------------------------------------
INSERT INTO public.spark_compta_fiscal_parameters (parameter_key, year, region, value_numeric, description) VALUES
  ('tva_normal',     2026, 'metropole', 20.00, 'Taux normal TVA métropole 2026'),
  ('tva_intermediaire', 2026, 'metropole', 10.00, 'Taux intermédiaire TVA métropole 2026'),
  ('tva_reduit',     2026, 'metropole', 5.50,  'Taux réduit TVA métropole 2026'),
  ('tva_super_reduit', 2026, 'metropole', 2.10, 'Taux super-réduit TVA métropole 2026');

-- ----------------------------------------------------------------------------
-- Taux de TVA DOM 2026 (Guadeloupe, Martinique, Réunion)
-- Mayotte et Guyane : régime spécifique (TVA 0 % en Guyane)
-- ----------------------------------------------------------------------------
INSERT INTO public.spark_compta_fiscal_parameters (parameter_key, year, region, value_numeric, description) VALUES
  ('tva_normal', 2026, 'guadeloupe', 8.50, 'Taux normal TVA Guadeloupe 2026'),
  ('tva_reduit', 2026, 'guadeloupe', 2.10, 'Taux réduit TVA Guadeloupe 2026'),
  ('tva_normal', 2026, 'martinique', 8.50, 'Taux normal TVA Martinique 2026'),
  ('tva_reduit', 2026, 'martinique', 2.10, 'Taux réduit TVA Martinique 2026'),
  ('tva_normal', 2026, 'reunion',    8.50, 'Taux normal TVA Réunion 2026'),
  ('tva_reduit', 2026, 'reunion',    2.10, 'Taux réduit TVA Réunion 2026'),
  ('tva_normal', 2026, 'guyane',     0.00, 'Pas de TVA en Guyane 2026'),
  ('tva_normal', 2026, 'mayotte',    0.00, 'Pas de TVA à Mayotte 2026');

-- ============================================================================
-- IMPORTANT : ces valeurs sont des valeurs DE RÉFÉRENCE et doivent être
-- validées par un expert-comptable avant le lancement en production.
-- ============================================================================
