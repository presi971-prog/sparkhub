-- ============================================================================
-- Migration 035 — Spark Compta : Row Level Security policies
-- ============================================================================
-- Description : Politiques de sécurité Row Level Security pour garantir que
-- chaque utilisateur ne peut accéder qu'à ses propres données (via son commerce).
-- Auteur      : Phase 2 Setup Infra — 11 avril 2026
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Fonction helper : retrouver les account_id du pro authentifié
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.spark_compta_get_user_account_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT sca.id
  FROM public.spark_compta_accounts sca
  INNER JOIN public.commerces c ON c.id = sca.commerce_id
  WHERE c.profile_id = auth.uid();
$$;

COMMENT ON FUNCTION public.spark_compta_get_user_account_ids IS
  'Retourne les account_id Spark Compta du pro authentifié (via son commerce)';

-- ----------------------------------------------------------------------------
-- spark_compta_accounts : un pro voit uniquement son compte
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "spark_compta_accounts_select" ON public.spark_compta_accounts;
CREATE POLICY "spark_compta_accounts_select"
  ON public.spark_compta_accounts
  FOR SELECT
  USING (
    commerce_id IN (SELECT id FROM public.commerces WHERE profile_id = auth.uid())
  );

DROP POLICY IF EXISTS "spark_compta_accounts_insert" ON public.spark_compta_accounts;
CREATE POLICY "spark_compta_accounts_insert"
  ON public.spark_compta_accounts
  FOR INSERT
  WITH CHECK (
    commerce_id IN (SELECT id FROM public.commerces WHERE profile_id = auth.uid())
  );

DROP POLICY IF EXISTS "spark_compta_accounts_update" ON public.spark_compta_accounts;
CREATE POLICY "spark_compta_accounts_update"
  ON public.spark_compta_accounts
  FOR UPDATE
  USING (
    commerce_id IN (SELECT id FROM public.commerces WHERE profile_id = auth.uid())
  );

DROP POLICY IF EXISTS "spark_compta_accounts_delete" ON public.spark_compta_accounts;
CREATE POLICY "spark_compta_accounts_delete"
  ON public.spark_compta_accounts
  FOR DELETE
  USING (
    commerce_id IN (SELECT id FROM public.commerces WHERE profile_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- spark_compta_categories : lecture seule pour tous les utilisateurs authentifiés
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "spark_compta_categories_select" ON public.spark_compta_categories;
CREATE POLICY "spark_compta_categories_select"
  ON public.spark_compta_categories
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Pas d'INSERT/UPDATE/DELETE pour les utilisateurs (table de référence système)

-- ----------------------------------------------------------------------------
-- spark_compta_custom_subcategories : filtré par account_id
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "spark_compta_custom_subcategories_all" ON public.spark_compta_custom_subcategories;
CREATE POLICY "spark_compta_custom_subcategories_all"
  ON public.spark_compta_custom_subcategories
  FOR ALL
  USING (account_id IN (SELECT public.spark_compta_get_user_account_ids()));

-- ----------------------------------------------------------------------------
-- spark_compta_projects : filtré par account_id
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "spark_compta_projects_all" ON public.spark_compta_projects;
CREATE POLICY "spark_compta_projects_all"
  ON public.spark_compta_projects
  FOR ALL
  USING (account_id IN (SELECT public.spark_compta_get_user_account_ids()));

-- ----------------------------------------------------------------------------
-- spark_compta_transactions : filtré par account_id (la plus importante)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "spark_compta_transactions_all" ON public.spark_compta_transactions;
CREATE POLICY "spark_compta_transactions_all"
  ON public.spark_compta_transactions
  FOR ALL
  USING (account_id IN (SELECT public.spark_compta_get_user_account_ids()));

-- ============================================================================
-- Notes pour les futures tables (à ajouter dans les migrations 027-034) :
--   - spark_compta_conversations        → filtré par account_id
--   - spark_compta_conversations_messages → filtré via jointure sur conversations
--   - spark_compta_fiscal_parameters    → lecture seule pour tous
--   - spark_compta_bank_transactions    → filtré par account_id
--   - spark_compta_actions_usage        → filtré par account_id
--   - spark_compta_alerts                → filtré par account_id
--   - spark_compta_exports               → filtré par account_id
-- ============================================================================
