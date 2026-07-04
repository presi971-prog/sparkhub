-- Migration 058 : autoriser le type 'blog_article' dans le calendrier éditorial.
--
-- Pourquoi : la machine de visibilité publie 2 articles de blog/semaine pour
-- Concours SPP (orchestrator.ts), mais la contrainte CHECK d'origine (migration
-- 020) n'acceptait que post_image/carousel/video → l'insertion des entrées
-- échouait en silence (constaté le 04/07 : calendrier SPP vide).
-- (cm_contents.content_type n'a pas de contrainte : rien d'autre à changer.)

ALTER TABLE cm_calendar DROP CONSTRAINT IF EXISTS cm_calendar_content_type_check;
ALTER TABLE cm_calendar ADD CONSTRAINT cm_calendar_content_type_check
  CHECK (content_type IN ('post_image', 'carousel', 'video', 'blog_article'));
