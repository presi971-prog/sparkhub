-- Migration 053 : sparkexecute_publications
--
-- Pourquoi : V1 stockait juste un flag `status='published'` sur le run lui-même
-- quand l'utilisateur cliquait "Marquer publié". V1.1 fait la VRAIE publication
-- multi-plateformes (GHL Blog, LinkedIn, Instagram, Facebook, Google Business
-- Profile…) et on a besoin de tracer chaque tentative par plateforme :
--   - quel post_id retourné par GHL / la plateforme ?
--   - quel statut (published, scheduled, failed) ?
--   - quel message d'erreur si fail ?
--   - quelle URL publique du post si disponible ?
--
-- 1 run SparkExecute peut donner N publications (1 article → 1 blog post ;
-- 1 post LinkedIn → 1 publication LinkedIn ; mais un visuel + caption peut
-- être publié à la fois sur LinkedIn ET Instagram → 2 publications).
--
-- RLS strict : un user ne voit que ses propres publications via auth.uid().

CREATE TABLE IF NOT EXISTS sparkexecute_publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Run d'origine. CASCADE : si l'user supprime définitivement le run,
  -- les publications associées disparaissent aussi (le contenu n'existe plus).
  run_id uuid NOT NULL REFERENCES sparkexecute_runs(id) ON DELETE CASCADE,

  -- Propriétaire (redondant avec run.user_id pour simplifier les RLS).
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Plateforme cible. Liste fermée — pour en ajouter, faire une migration.
  --   ghl_blog          : article publié sur le blog DCG AI via GHL Blog API
  --   linkedin          : post publié via GHL Social Planner (Page LinkedIn)
  --   instagram         : post publié via GHL Social Planner (Business account)
  --   facebook          : post publié via GHL Social Planner (Page Facebook)
  --   google_business   : post publié via GHL Social Planner (GBP)
  --   youtube           : (V1.2) post YouTube via GHL Social Planner
  --   tiktok            : (V1.2) post TikTok via GHL Social Planner
  --   threads           : (V1.2) post Threads via GHL Social Planner
  platform text NOT NULL CHECK (platform IN (
    'ghl_blog',
    'linkedin',
    'instagram',
    'facebook',
    'google_business',
    'youtube',
    'tiktok',
    'threads'
  )),

  -- ID de la publication tel que retourné par GHL / la plateforme.
  -- Ex : post_id GHL Blog, post_id Social Planner. Null tant que pas publié.
  external_id text,

  -- URL publique du post si la plateforme la renvoie (ou si on peut la construire).
  -- Permet d'afficher un bouton "Voir le post" dans l'UI.
  external_url text,

  -- État courant de la publication :
  --   pending    : en cours d'appel API plateforme
  --   published  : OK, la publication est en ligne
  --   scheduled  : programmée à une date future (publication différée)
  --   failed     : l'appel API a échoué (voir error_message)
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'published',
    'scheduled',
    'failed'
  )),

  -- Si publication programmée, date prévue. Null pour publication immédiate.
  scheduled_at timestamptz,

  -- Date à laquelle on a effectivement publié (réponse OK de la plateforme).
  -- Null tant que pas publié.
  published_at timestamptz,

  -- Message d'erreur lisible si status = 'failed'. Affiché tel quel à l'user
  -- (donc ne JAMAIS y mettre de stack trace ou de secret).
  error_message text,

  -- Bag jsonb pour stocker la réponse brute de l'API (utile au debug) +
  -- d'éventuels paramètres custom (accountId, categoryId, tags, etc.).
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index : pour le dashboard "Mes publications" trié par date desc.
CREATE INDEX IF NOT EXISTS sparkexecute_publications_user_created_idx
  ON sparkexecute_publications(user_id, created_at DESC);

-- Index : lookup rapide "quelles publications pour ce run ?"
CREATE INDEX IF NOT EXISTS sparkexecute_publications_run_idx
  ON sparkexecute_publications(run_id);

-- Index : filtres de monitoring (ex : toutes les failed LinkedIn pour debug).
CREATE INDEX IF NOT EXISTS sparkexecute_publications_platform_status_idx
  ON sparkexecute_publications(platform, status);

-- RLS
ALTER TABLE sparkexecute_publications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own sparkexecute_publications"
  ON sparkexecute_publications;
CREATE POLICY "Users read own sparkexecute_publications"
  ON sparkexecute_publications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own sparkexecute_publications"
  ON sparkexecute_publications;
CREATE POLICY "Users insert own sparkexecute_publications"
  ON sparkexecute_publications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own sparkexecute_publications"
  ON sparkexecute_publications;
CREATE POLICY "Users update own sparkexecute_publications"
  ON sparkexecute_publications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own sparkexecute_publications"
  ON sparkexecute_publications;
CREATE POLICY "Users delete own sparkexecute_publications"
  ON sparkexecute_publications FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access sparkexecute_publications"
  ON sparkexecute_publications;
CREATE POLICY "Service role full access sparkexecute_publications"
  ON sparkexecute_publications FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE sparkexecute_publications IS
  'Trace des publications multi-plateformes (GHL Blog, Social Planner) faites depuis un run SparkExecute. 1 ligne par (run, plateforme).';
