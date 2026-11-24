ALTER TABLE image_build_jobs ADD COLUMN command_route TEXT;
ALTER TABLE image_source_jobs ADD COLUMN command_route TEXT;
ALTER TABLE image_source_runs ADD COLUMN command_route TEXT;
ALTER TABLE software_images ADD COLUMN command_route TEXT;
ALTER TABLE image_build_jobs ADD COLUMN machine_token_ciphertext TEXT;
ALTER TABLE software_images ADD COLUMN machine_token_ciphertext TEXT;

CREATE TRIGGER image_build_jobs_clear_machine_token
AFTER UPDATE OF phase ON image_build_jobs
WHEN NEW.phase = 'done' AND NEW.machine_token_ciphertext IS NOT NULL BEGIN
  UPDATE image_build_jobs SET machine_token_ciphertext = NULL
  WHERE build_id = NEW.build_id;
END;
