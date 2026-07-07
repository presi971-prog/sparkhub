-- Migration 059 : autoriser le type 'quiz' dans le calendrier éditorial.
--
-- Pourquoi : la machine de visibilité publie 2 « QCM du jour » par semaine pour
-- Concours SPP (posts d'engagement : question vérifiée + réponse en commentaire).
-- Comme pour 'blog_article' (migration 058), la contrainte CHECK doit être
-- étendue, sinon l'insertion des entrées échoue en silence.
-- (cm_contents.content_type n'a toujours pas de contrainte : rien d'autre à changer.)

ALTER TABLE cm_calendar DROP CONSTRAINT IF EXISTS cm_calendar_content_type_check;
ALTER TABLE cm_calendar ADD CONSTRAINT cm_calendar_content_type_check
  CHECK (content_type IN ('post_image', 'carousel', 'video', 'blog_article', 'quiz'));
