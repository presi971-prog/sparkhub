-- Migration 054 : autorise le type de livrable 'carousel' dans SparkExecute.
--
-- Pourquoi : SparkExecute devient un studio média (texte + image + CAROUSEL +
-- vidéo à venir). Le carrousel = plusieurs slides image-avec-texte (gpt-image-1),
-- stockées dans output.metadata.slides. La colonne `type` a une contrainte CHECK
-- (migration 052) qui n'incluait pas 'carousel' : on la met à jour.
--
-- Idempotent : on droppe la contrainte si elle existe puis on la recrée.

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
    'page_accueil',
    'schema_markup'
  ));
