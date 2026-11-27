-- The admin who selected Build computer while this refresh ran. The build
-- starts for that admin when the refresh ends. Null when no admin asked.
ALTER TABLE image_build_jobs ADD COLUMN requested_build_user_id TEXT
  REFERENCES users(id) ON DELETE SET NULL;
