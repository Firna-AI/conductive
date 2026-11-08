ALTER TABLE org_deletions ADD COLUMN restore_request_id TEXT;
ALTER TABLE org_deletions ADD COLUMN restore_requested_at INTEGER;
ALTER TABLE org_deletions ADD COLUMN restore_requested_by_user_id TEXT;
