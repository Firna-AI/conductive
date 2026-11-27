-- Raw used bytes of the root file system at the build's measurement.
-- Existing rows and inserts from previous Workers get null.
ALTER TABLE image_builds ADD COLUMN storage_root_used_bytes INTEGER;
