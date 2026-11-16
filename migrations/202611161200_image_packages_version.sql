-- The version of the apt part of the software step that each image holds.
-- NULL or an empty text means unknown, so the next build from that image
-- runs the apt part.
ALTER TABLE image_build_jobs ADD COLUMN packages_version TEXT;
ALTER TABLE software_images ADD COLUMN packages_version TEXT;
