-- Migration: Refresh Guadeloupe communes data
-- Run this to ensure communes are properly populated

TRUNCATE communes CASCADE;

INSERT INTO communes (name, zone, code_postal, latitude, longitude) VALUES
  ('Pointe-à-Pitre', 'grande_terre', '97110', 16.2411, -61.5331),
  ('Les Abymes', 'grande_terre', '97139', 16.2700, -61.5028),
  ('Le Gosier', 'grande_terre', '97190', 16.2167, -61.4833),
  ('Sainte-Anne', 'grande_terre', '97180', 16.2269, -61.3839),
  ('Saint-François', 'grande_terre', '97118', 16.2500, -61.2667),
  ('Le Moule', 'grande_terre', '97160', 16.3333, -61.3500),
  ('Morne-à-l''Eau', 'grande_terre', '97111', 16.3333, -61.4500),
  ('Petit-Canal', 'grande_terre', '97131', 16.3833, -61.4833),
  ('Port-Louis', 'grande_terre', '97117', 16.4167, -61.5333),
  ('Anse-Bertrand', 'grande_terre', '97121', 16.4667, -61.5000),
  ('Basse-Terre', 'basse_terre', '97100', 15.9958, -61.7292),
  ('Baie-Mahault', 'basse_terre', '97122', 16.2667, -61.5833),
  ('Petit-Bourg', 'basse_terre', '97170', 16.2000, -61.5833),
  ('Lamentin', 'basse_terre', '97129', 16.2667, -61.6333),
  ('Sainte-Rose', 'basse_terre', '97115', 16.3333, -61.7000),
  ('Deshaies', 'basse_terre', '97126', 16.3000, -61.7833),
  ('Pointe-Noire', 'basse_terre', '97116', 16.2333, -61.7833),
  ('Bouillante', 'basse_terre', '97125', 16.1333, -61.7667),
  ('Vieux-Habitants', 'basse_terre', '97119', 16.0500, -61.7667),
  ('Baillif', 'basse_terre', '97123', 16.0167, -61.7500),
  ('Saint-Claude', 'basse_terre', '97120', 16.0167, -61.7000),
  ('Gourbeyre', 'basse_terre', '97113', 15.9833, -61.7000),
  ('Vieux-Fort', 'basse_terre', '97141', 15.9500, -61.7000),
  ('Trois-Rivières', 'basse_terre', '97114', 15.9667, -61.6500),
  ('Capesterre-Belle-Eau', 'basse_terre', '97130', 16.0500, -61.5667),
  ('Goyave', 'basse_terre', '97128', 16.1333, -61.5667),
  ('Grand-Bourg', 'marie_galante', '97112', 15.8833, -61.3167),
  ('Capesterre-de-Marie-Galante', 'marie_galante', '97140', 15.9000, -61.2500),
  ('Saint-Louis', 'marie_galante', '97134', 15.9500, -61.3167),
  ('Terre-de-Haut', 'les_saintes', '97137', 15.8667, -61.5833),
  ('Terre-de-Bas', 'les_saintes', '97136', 15.8500, -61.6333),
  ('La Désirade', 'la_desirade', '97127', 16.3167, -61.0500);
