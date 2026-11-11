ALTER TABLE image_builds ADD COLUMN software_version TEXT;
ALTER TABLE image_builds ADD COLUMN install_script_revision TEXT;
ALTER TABLE image_builds ADD COLUMN refresh_cause TEXT;

ALTER TABLE image_build_jobs ADD COLUMN software_version TEXT;
ALTER TABLE image_build_jobs ADD COLUMN install_script_revision TEXT;

ALTER TABLE workspaces ADD COLUMN software_version TEXT;
ALTER TABLE workspaces ADD COLUMN org_image_build_id TEXT;
ALTER TABLE workspaces ADD COLUMN install_script_revision TEXT;
ALTER TABLE workspaces ADD COLUMN software_update_failed INTEGER NOT NULL DEFAULT 0;
