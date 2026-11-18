ALTER TABLE agent_logins ADD COLUMN endpoint_model_ids TEXT;
ALTER TABLE agent_logins ADD COLUMN endpoint_models_read_at INTEGER;
ALTER TABLE agent_logins ADD COLUMN endpoint_models_attempted_at INTEGER;
ALTER TABLE agent_logins ADD COLUMN endpoint_models_attempt_id TEXT;
