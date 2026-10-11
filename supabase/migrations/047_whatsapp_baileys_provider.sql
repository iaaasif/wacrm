-- ============================================================
-- 047_whatsapp_baileys_provider.sql
--
-- Supports WhatsApp Linked Device (Baileys) alongside Meta Cloud API.
-- Adds `provider` discriminator ('meta' | 'baileys') and Baileys-specific
-- state fields to `whatsapp_config`.
-- ============================================================

-- 1. Relax NOT NULL constraints on Meta-only fields so Baileys-first
-- configurations can exist without dummy placeholder strings.
ALTER TABLE whatsapp_config ALTER COLUMN phone_number_id DROP NOT NULL;
ALTER TABLE whatsapp_config ALTER COLUMN access_token DROP NOT NULL;

-- 2. Add provider column with default 'meta' to preserve existing installs.
ALTER TABLE whatsapp_config
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'meta'
  CHECK (provider IN ('meta', 'baileys'));

-- 3. Add Baileys connection state and phone identity columns.
ALTER TABLE whatsapp_config
  ADD COLUMN IF NOT EXISTS baileys_phone TEXT,
  ADD COLUMN IF NOT EXISTS baileys_jid TEXT,
  ADD COLUMN IF NOT EXISTS baileys_status TEXT NOT NULL DEFAULT 'disconnected'
  CHECK (baileys_status IN ('connected', 'disconnected', 'connecting')),
  ADD COLUMN IF NOT EXISTS baileys_connected_at TIMESTAMPTZ;

COMMENT ON COLUMN whatsapp_config.provider IS
  'Active WhatsApp provider: "meta" for Meta Cloud API or "baileys" for Linked Device Web protocol.';
COMMENT ON COLUMN whatsapp_config.baileys_phone IS
  'Normalized phone number linked via Baileys QR code pairing.';
COMMENT ON COLUMN whatsapp_config.baileys_jid IS
  'Full WhatsApp JID of the linked device (e.g. 88017XXXXXXXX@s.whatsapp.net).';
COMMENT ON COLUMN whatsapp_config.baileys_status IS
  'Connection status of the Baileys gateway: connected, disconnected, or connecting.';
