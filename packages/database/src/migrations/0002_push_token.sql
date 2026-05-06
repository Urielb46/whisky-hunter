-- Migration 0002: add push_token column for Expo push notifications
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token text;
