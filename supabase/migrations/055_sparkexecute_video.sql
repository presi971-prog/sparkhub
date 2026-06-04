-- Migration 055 : autorise le type de livrable 'video' dans SparkExecute.
--
-- Studio média ULTRA : texte + image + carrousel + VIDÉO (Reel ~8 s via Veo,
-- ré-hébergée en .mp4 dans le bucket sparkexecute-visuals, dont les mime types
-- ont été mis à jour pour accepter video/mp4 via l'API Storage).
--
-- Idempotent : drop puis recrée la contrainte CHECK de la colonne `type`.

ALTER TABLE sparkexecute_runs
  DROP CONSTRAINT IF EXISTS sparkexecute_runs_type_check;

ALTER TABLE sparkexecute_runs
  ADD CONSTRAINT sparkexecute_runs_type_check CHECK (type IN (
    'article_seo',
    'article_long',
    'article_court',
    'faq',
    'post_linkedin',
    'post_instagram',
    'hooks_pub',
    'visual',
    'carousel',
    'video',
    'page_accueil',
    'schema_markup'
  ));
