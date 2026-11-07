-- NULL preserves the original folder layout of snapshots and workspaces.
ALTER TABLE image_build_jobs ADD COLUMN repository_locations_json TEXT;
ALTER TABLE image_build_jobs ADD COLUMN previous_repository_locations_json TEXT;
ALTER TABLE workspace_creation_plans ADD COLUMN repositories_json TEXT;
ALTER TABLE workspace_creation_plans ADD COLUMN repository_locations_json TEXT;
ALTER TABLE workspace_creation_plans ADD COLUMN message_text TEXT;
ALTER TABLE workspace_runtime ADD COLUMN repository_locations_json TEXT;
