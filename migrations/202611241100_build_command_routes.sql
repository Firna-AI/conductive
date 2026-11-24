ALTER TABLE image_build_jobs ADD COLUMN command_route TEXT;
ALTER TABLE image_source_jobs ADD COLUMN command_route TEXT;
ALTER TABLE image_source_runs ADD COLUMN command_route TEXT;
ALTER TABLE software_images ADD COLUMN command_route TEXT;
ALTER TABLE image_build_jobs ADD COLUMN machine_token_ciphertext TEXT;
ALTER TABLE software_images ADD COLUMN machine_token_ciphertext TEXT;
