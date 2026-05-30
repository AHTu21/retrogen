-- Cloud profile prefs (identity, notepad, room theme, notifications) — без data URL
ALTER TABLE "User" ADD COLUMN "profileJson" JSONB;
