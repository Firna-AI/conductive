ALTER TABLE agent_logins ADD COLUMN no_reuse INTEGER NOT NULL DEFAULT 0;

UPDATE agent_logins SET no_reuse = 1 WHERE agent = 'claude' AND kind = 'token';
