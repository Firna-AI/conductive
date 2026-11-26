-- The free storage that each good build of the org image leaves, measured
-- with df just before the save. Both columns stay empty for older builds and
-- for a build whose measurement failed. The previous Worker does not read
-- them, so it keeps working.
ALTER TABLE image_builds ADD COLUMN storage_total_bytes INTEGER;
ALTER TABLE image_builds ADD COLUMN storage_free_bytes INTEGER;
