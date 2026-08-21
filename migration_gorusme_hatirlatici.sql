-- Görüşmeler tablosuna hatırlatma alanları ekler.
-- SADECE BİR KEZ çalıştır.
ALTER TABLE meetings ADD COLUMN remind_at TEXT DEFAULT '';
ALTER TABLE meetings ADD COLUMN remind_note TEXT DEFAULT '';
ALTER TABLE meetings ADD COLUMN reminder_status TEXT DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_meetings_remind_at ON meetings(remind_at);
