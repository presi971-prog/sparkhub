-- ============================================================================
-- Migration 026 — Spark Compta : spark_compta_transactions
-- ============================================================================
-- Description : Table centrale du produit. Chaque ligne = une dépense ou une
-- recette loggée par le pro (via WhatsApp texte, vocal, photo ou manuel).
-- C'est la table la plus importante.
-- Auteur      : Phase 2 Setup Infra — 11 avril 2026
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.spark_compta_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  account_id UUID NOT NULL REFERENCES public.spark_compta_accounts(id) ON DELETE CASCADE,

  -- Type (dépense ou recette)
  type TEXT NOT NULL CHECK (type IN ('depense', 'recette')),

  -- Montant en centimes (jamais de float, toujours bigint)
  amount_cents BIGINT NOT NULL,

  -- Devise (par défaut EUR)
  currency TEXT NOT NULL DEFAULT 'EUR',

  -- Date à laquelle la transaction a eu lieu (distincte de created_at)
  transaction_date TIMESTAMPTZ NOT NULL,

  -- Description libre (ce que le pro a dit/écrit)
  description TEXT NOT NULL,

  -- Catégorie principale (table de référence)
  category_id UUID NOT NULL REFERENCES public.spark_compta_categories(id) ON DELETE RESTRICT,

  -- Sous-catégorie libre (optionnelle)
  custom_subcategory_id UUID REFERENCES public.spark_compta_custom_subcategories(id) ON DELETE SET NULL,

  -- Projet/chantier/mission rattaché (optionnel mais encouragé pour certaines familles)
  project_id UUID REFERENCES public.spark_compta_projects(id) ON DELETE SET NULL,

  -- Source de la saisie
  source TEXT NOT NULL DEFAULT 'texte' CHECK (source IN ('texte', 'vocal', 'photo', 'manuel')),

  -- URL de la photo de ticket si source = photo (Supabase Storage)
  receipt_image_url TEXT,

  -- Pourcentage d'usage pro pour les dépenses mixtes (0-100, défaut 100)
  pro_percentage INT NOT NULL DEFAULT 100 CHECK (pro_percentage BETWEEN 0 AND 100),

  -- Taux de TVA appliqué à cette transaction (nullable si non renseigné)
  tva_rate_applied NUMERIC(4,2),

  -- Validation humaine obligatoire pour OCR > 50 € (règle de principe)
  is_validated_by_user BOOLEAN NOT NULL DEFAULT false,

  -- Message brut du pro (pour audit et débogage)
  raw_input TEXT,

  -- Sortie brute du LLM (pour debug, optionnel)
  parsed_by_llm JSONB,

  -- Métadonnées
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Soft delete (pour ne pas perdre les données en cas d'erreur)
  deleted_at TIMESTAMPTZ
);

-- Index critiques (le dashboard et les requêtes fréquentes en dépendent)

-- Pour les listes de transactions triées par date (la requête la plus fréquente)
CREATE INDEX IF NOT EXISTS idx_spark_compta_transactions_account_date
  ON public.spark_compta_transactions(account_id, transaction_date DESC)
  WHERE deleted_at IS NULL;

-- Pour filtrer par type (dépense/recette) et date
CREATE INDEX IF NOT EXISTS idx_spark_compta_transactions_account_type_date
  ON public.spark_compta_transactions(account_id, type, transaction_date DESC)
  WHERE deleted_at IS NULL;

-- Pour les stats par catégorie (dashboard Top 3 dépenses)
CREATE INDEX IF NOT EXISTS idx_spark_compta_transactions_category
  ON public.spark_compta_transactions(account_id, category_id)
  WHERE deleted_at IS NULL;

-- Pour les marges par projet (dashboard familles Mains agiles / Cerveau / Créatifs / Hébergeurs)
CREATE INDEX IF NOT EXISTS idx_spark_compta_transactions_project
  ON public.spark_compta_transactions(project_id)
  WHERE project_id IS NOT NULL AND deleted_at IS NULL;

-- Pour la détection de doublons (même montant + même date + même description à ±5 minutes)
CREATE INDEX IF NOT EXISTS idx_spark_compta_transactions_dedup
  ON public.spark_compta_transactions(account_id, amount_cents, transaction_date, category_id)
  WHERE deleted_at IS NULL;

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION public.spark_compta_transactions_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER spark_compta_transactions_set_updated_at
  BEFORE UPDATE ON public.spark_compta_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.spark_compta_transactions_update_timestamp();

ALTER TABLE public.spark_compta_transactions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.spark_compta_transactions IS 'Table centrale : toutes les dépenses et recettes loggées';
COMMENT ON COLUMN public.spark_compta_transactions.amount_cents IS 'Montant en centimes (bigint, jamais float, évite les erreurs d''arrondi)';
COMMENT ON COLUMN public.spark_compta_transactions.deleted_at IS 'Soft delete — les transactions supprimées ne sont jamais vraiment effacées';
