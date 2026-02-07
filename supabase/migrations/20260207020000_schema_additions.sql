-- Schema additions: bilingual intro text, soft delete, category colors, answer tracking
-- Adds columns to themes, categories, and user_card_state tables

-- Themes: bilingual intro text for reading mode
ALTER TABLE themes ADD COLUMN IF NOT EXISTS intro_text_en TEXT;
ALTER TABLE themes ADD COLUMN IF NOT EXISTS intro_text_es TEXT;

-- Themes: soft delete support
ALTER TABLE themes ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Categories: hex color for UI
ALTER TABLE categories ADD COLUMN IF NOT EXISTS color TEXT;

-- User card state: answer tracking counters
ALTER TABLE user_card_state ADD COLUMN IF NOT EXISTS times_correct INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_card_state ADD COLUMN IF NOT EXISTS times_incorrect INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_card_state ADD COLUMN IF NOT EXISTS times_idk INTEGER NOT NULL DEFAULT 0;
