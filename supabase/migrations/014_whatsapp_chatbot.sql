-- ============================================
-- Migration 014: WhatsApp Chatbot
-- Tables pour le chatbot WhatsApp Cobeone
-- ============================================

-- Type de commerce
CREATE TYPE commerce_type AS ENUM ('restaurant', 'artisan', 'beaute', 'commerce');

-- Statut de conversation
CREATE TYPE conversation_status AS ENUM ('active', 'closed');

-- Statut de réservation
CREATE TYPE reservation_status AS ENUM ('pending', 'confirmed', 'cancelled');

-- ============================================
-- Table: commerces
-- Infos du commerce pour le bot WhatsApp
-- ============================================
CREATE TABLE commerces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  type commerce_type NOT NULL DEFAULT 'commerce',
  description TEXT,
  adresse TEXT,
  telephone TEXT,
  horaires JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id)
);

-- Un pro = un seul commerce (UNIQUE sur profile_id)

-- ============================================
-- Table: commerce_items
-- Menu, services, tarifs du commerce
-- ============================================
CREATE TABLE commerce_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commerce_id UUID NOT NULL REFERENCES commerces(id) ON DELETE CASCADE,
  categorie TEXT NOT NULL,
  nom TEXT NOT NULL,
  prix DECIMAL(10, 2),
  description TEXT,
  ordre INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Table: commerce_faq
-- Questions/réponses personnalisées
-- ============================================
CREATE TABLE commerce_faq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commerce_id UUID NOT NULL REFERENCES commerces(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  reponse TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Table: whatsapp_conversations
-- Historique des conversations WhatsApp
-- ============================================
CREATE TABLE whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commerce_id UUID REFERENCES commerces(id) ON DELETE SET NULL,
  client_phone TEXT NOT NULL,
  client_name TEXT,
  messages JSONB NOT NULL DEFAULT '[]',
  status conversation_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour retrouver la conversation active d'un client
CREATE INDEX idx_conversations_client_phone ON whatsapp_conversations(client_phone, status);
CREATE INDEX idx_conversations_commerce ON whatsapp_conversations(commerce_id);

-- ============================================
-- Table: reservations
-- Réservations/RDV via le bot
-- ============================================
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commerce_id UUID NOT NULL REFERENCES commerces(id) ON DELETE CASCADE,
  client_phone TEXT NOT NULL,
  client_name TEXT,
  date DATE NOT NULL,
  heure TIME NOT NULL,
  nombre_personnes INTEGER,
  note TEXT,
  status reservation_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reservations_commerce ON reservations(commerce_id, date);

-- ============================================
-- Trigger: updated_at automatique
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER commerces_updated_at
  BEFORE UPDATE ON commerces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON whatsapp_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- RLS Policies
-- ============================================
ALTER TABLE commerces ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce_faq ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Commerces: le pro voit/modifie son commerce, admin voit tout
CREATE POLICY "Users can view own commerce"
  ON commerces FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert own commerce"
  ON commerces FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update own commerce"
  ON commerces FOR UPDATE
  USING (auth.uid() = profile_id);

CREATE POLICY "Admins can view all commerces"
  ON commerces FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Commerce items: même logique via commerce_id
CREATE POLICY "Users can manage own commerce items"
  ON commerce_items FOR ALL
  USING (
    EXISTS (SELECT 1 FROM commerces WHERE id = commerce_id AND profile_id = auth.uid())
  );

CREATE POLICY "Admins can view all commerce items"
  ON commerce_items FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Commerce FAQ: même logique
CREATE POLICY "Users can manage own commerce faq"
  ON commerce_faq FOR ALL
  USING (
    EXISTS (SELECT 1 FROM commerces WHERE id = commerce_id AND profile_id = auth.uid())
  );

CREATE POLICY "Admins can view all commerce faq"
  ON commerce_faq FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Conversations: le pro voit les conversations de son commerce
CREATE POLICY "Users can view own commerce conversations"
  ON whatsapp_conversations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM commerces WHERE id = commerce_id AND profile_id = auth.uid())
  );

CREATE POLICY "Admins can view all conversations"
  ON whatsapp_conversations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Réservations: le pro voit/modifie les réservations de son commerce
CREATE POLICY "Users can view own commerce reservations"
  ON reservations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM commerces WHERE id = commerce_id AND profile_id = auth.uid())
  );

CREATE POLICY "Users can update own commerce reservations"
  ON reservations FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM commerces WHERE id = commerce_id AND profile_id = auth.uid())
  );

CREATE POLICY "Admins can view all reservations"
  ON reservations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Service role (webhook) peut tout faire
CREATE POLICY "Service role full access commerces"
  ON commerces FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access conversations"
  ON whatsapp_conversations FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access reservations"
  ON reservations FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access items"
  ON commerce_items FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access faq"
  ON commerce_faq FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
