-- Migration 052 : initialisation SparkExecute (3e outil de la triade SparkScan)
--
-- Pourquoi : SparkExecute est l'atelier qui PRODUIT réellement les livrables
-- marketing (articles SEO, posts LinkedIn, visuels) à partir des tâches
-- générées par SparkPilot. C'est la 3e étape de la triade :
--   1) SparkScan  : œil / audit
--   2) SparkPilot : pilote / cerveau (qui / comment / quand)
--   3) SparkExecute : exécutant / mains (rédige + génère + publie)
--
-- 2 tables :
--   - sparkexecute_runs  : un "run" = une création (1 article, 1 post, 1 visuel)
--   - sparkexecute_usage : compteur quotidien par user (volume + coût Claude/Kie)
--
-- Plus 1 bucket Storage :
--   - sparkexecute-visuals : images générées par Nano Banana (publiques en lecture)
--
-- Toutes les tables sont en RLS strict : un user ne voit que ses propres runs
-- via auth.uid().

-- ============================================================
-- 1. sparkexecute_runs
-- ============================================================
-- Un run = une demande de génération. Ex : "fais-moi un article SEO sur
-- l'IA pour les restaurants en GP". Le run a un statut (generating →
-- draft → validated → published) et stocke à la fois le brief d'entrée
-- (input_brief) et le livrable produit (output).
CREATE TABLE IF NOT EXISTS sparkexecute_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Tâche SparkPilot d'origine (optionnelle : un run peut être créé "à la main"
  -- sans passer par une tâche). ON DELETE SET NULL pour garder le run en vie
  -- même si la tâche source est supprimée.
  task_id uuid REFERENCES sparkpilot_tasks(id) ON DELETE SET NULL,

  -- Type de livrable. Liste fermée — pour ajouter un type, faire une migration.
  --   article_seo    : article SEO standard (taille définie par input_brief.longueur_souhaitee)
  --   article_long   : article long format pillar (2000-3000 mots)
  --   article_court  : article court (600-1000 mots)
  --   faq            : 5-10 questions-réponses avec Schema markup
  --   post_linkedin  : post LinkedIn Hook-Story-CTA (max 1300 caractères)
  --   post_instagram : post Instagram (caption + hashtags)
  --   hooks_pub      : 3-5 accroches publicitaires Meta/Google
  --   visual         : visuel généré (Nano Banana, image 1080×1080 par défaut)
  --   page_accueil   : page d'accueil structurée StoryBrand/AIDA
  --   schema_markup  : bloc Schema.org JSON-LD prêt à coller
  type text NOT NULL CHECK (type IN (
    'article_seo',
    'article_long',
    'article_court',
    'faq',
    'post_linkedin',
    'post_instagram',
    'hooks_pub',
    'visual',
    'page_accueil',
    'schema_markup'
  )),

  -- Framework utilisé pour la génération (ex : "Pillar+Cluster", "Hook-Story-CTA",
  -- "StoryBrand"). Hérité de la tâche SparkPilot ou choisi par défaut selon le type.
  framework_used text,

  -- Brief d'entrée. Structure libre (jsonb) côté DB mais typée côté TS
  -- (cf. RunInputBrief dans src/lib/sparkexecute/types.ts) :
  --   { sujet, audience, ton, mots_cles[], longueur_souhaitee, framework_override? }
  input_brief jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Livrable produit. Structure libre côté DB, typée côté TS (cf. RunOutput) :
  --   { content, image_url?, alt_text?, hashtags?, metadata? }
  output jsonb DEFAULT '{}'::jsonb,

  -- État du run :
  --   generating : Claude / Nano Banana en train de générer
  --   draft      : brouillon prêt, en attente de validation user
  --   validated  : user a validé le brouillon (prêt à publier)
  --   published  : publié (V1 = juste flag, V1.1 = vraie publication API)
  --   archived   : soft delete (mis de côté par l'user)
  --   failed     : génération échouée (voir error_message)
  status text NOT NULL DEFAULT 'generating' CHECK (status IN (
    'generating',
    'draft',
    'validated',
    'published',
    'archived',
    'failed'
  )),

  -- Coût en dollars (Claude + Nano Banana). Sert au compteur usage et à
  -- l'affichage "Crédits restants ce mois" du dashboard.
  cost_usd numeric(10,4) DEFAULT 0,

  -- Tokens consommés côté Claude (utiles pour le debug et l'analyse de coût).
  tokens_input integer DEFAULT 0,
  tokens_output integer DEFAULT 0,

  -- Message d'erreur lisible si status = 'failed'. Affiché tel quel à l'user
  -- (donc ne JAMAIS y mettre de stack trace ou de secret).
  error_message text,

  -- Bag jsonb pour stocker du contexte additionnel sans migration future
  -- (ex : kie_request_id, generated_width, schema_jsonld, etc.).
  metadata jsonb DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  validated_at timestamptz,
  published_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index : pour le dashboard "Mes créations" trié par date desc.
CREATE INDEX IF NOT EXISTS sparkexecute_runs_user_created_idx
  ON sparkexecute_runs(user_id, created_at DESC);

-- Index partiel : permet le lookup rapide "ai-je déjà un run pour cette tâche ?"
-- (idempotence du bouton "Faire avec SparkExecute" côté SparkPilot).
CREATE INDEX IF NOT EXISTS sparkexecute_runs_task_idx
  ON sparkexecute_runs(task_id) WHERE task_id IS NOT NULL;

-- Index : filtre rapide par statut (dashboard "Brouillons à valider", etc.).
CREATE INDEX IF NOT EXISTS sparkexecute_runs_user_status_idx
  ON sparkexecute_runs(user_id, status);

-- Trigger updated_at : auto-update à chaque UPDATE.
CREATE OR REPLACE FUNCTION public.sparkexecute_runs_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sparkexecute_runs_set_updated_at ON sparkexecute_runs;
CREATE TRIGGER sparkexecute_runs_set_updated_at
  BEFORE UPDATE ON sparkexecute_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.sparkexecute_runs_update_timestamp();

-- RLS
ALTER TABLE sparkexecute_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own sparkexecute_runs" ON sparkexecute_runs;
CREATE POLICY "Users read own sparkexecute_runs"
  ON sparkexecute_runs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own sparkexecute_runs" ON sparkexecute_runs;
CREATE POLICY "Users insert own sparkexecute_runs"
  ON sparkexecute_runs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own sparkexecute_runs" ON sparkexecute_runs;
CREATE POLICY "Users update own sparkexecute_runs"
  ON sparkexecute_runs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own sparkexecute_runs" ON sparkexecute_runs;
CREATE POLICY "Users delete own sparkexecute_runs"
  ON sparkexecute_runs FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access sparkexecute_runs" ON sparkexecute_runs;
CREATE POLICY "Service role full access sparkexecute_runs"
  ON sparkexecute_runs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE sparkexecute_runs IS 'Un run SparkExecute = une création de livrable (article, post, visuel). 1 run par livrable produit.';

-- ============================================================
-- 2. sparkexecute_usage
-- ============================================================
-- Compteur quotidien par user. Sert à :
--   - afficher "Crédits restants ce mois" sur le dashboard
--   - rate-limiter les utilisateurs gros consommateurs
--   - facturer si on bascule un jour sur du pay-per-use
--
-- Clé composite (user_id, day) : 1 ligne par user par jour.
CREATE TABLE IF NOT EXISTS sparkexecute_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL,
  runs_count integer NOT NULL DEFAULT 0,
  cost_usd numeric(10,4) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);

CREATE INDEX IF NOT EXISTS sparkexecute_usage_day_idx
  ON sparkexecute_usage(day DESC);

ALTER TABLE sparkexecute_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own sparkexecute_usage" ON sparkexecute_usage;
CREATE POLICY "Users read own sparkexecute_usage"
  ON sparkexecute_usage FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own sparkexecute_usage" ON sparkexecute_usage;
CREATE POLICY "Users insert own sparkexecute_usage"
  ON sparkexecute_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own sparkexecute_usage" ON sparkexecute_usage;
CREATE POLICY "Users update own sparkexecute_usage"
  ON sparkexecute_usage FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own sparkexecute_usage" ON sparkexecute_usage;
CREATE POLICY "Users delete own sparkexecute_usage"
  ON sparkexecute_usage FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access sparkexecute_usage" ON sparkexecute_usage;
CREATE POLICY "Service role full access sparkexecute_usage"
  ON sparkexecute_usage FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE sparkexecute_usage IS 'Compteur quotidien des runs SparkExecute par user (volume et coût).';

-- ============================================================
-- 3. Bucket Storage : sparkexecute-visuals
-- ============================================================
-- Stocke les images générées par Nano Banana (kie.ai).
-- Public en lecture (les visuels servent à des posts publics) ; écriture
-- réservée au service_role (le côté serveur upload après génération).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sparkexecute-visuals',
  'sparkexecute-visuals',
  true,
  10485760, -- 10 MB max par fichier
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read sparkexecute-visuals" ON storage.objects;
CREATE POLICY "Public read sparkexecute-visuals"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'sparkexecute-visuals');

DROP POLICY IF EXISTS "Service role write sparkexecute-visuals" ON storage.objects;
CREATE POLICY "Service role write sparkexecute-visuals"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'sparkexecute-visuals'
    AND auth.role() = 'service_role'
  );

DROP POLICY IF EXISTS "Service role update sparkexecute-visuals" ON storage.objects;
CREATE POLICY "Service role update sparkexecute-visuals"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'sparkexecute-visuals'
    AND auth.role() = 'service_role'
  );

DROP POLICY IF EXISTS "Service role delete sparkexecute-visuals" ON storage.objects;
CREATE POLICY "Service role delete sparkexecute-visuals"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'sparkexecute-visuals'
    AND auth.role() = 'service_role'
  );
