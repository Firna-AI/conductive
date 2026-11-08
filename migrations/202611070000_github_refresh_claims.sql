-- A refresh consumes a one-time token. An interrupted claim must never be
-- reassigned, because GitHub might already have consumed that token.
-- A new sign-in replaces the bundle and clears the claim.
ALTER TABLE github_connections ADD COLUMN refresh_claim TEXT;
ALTER TABLE github_connections ADD COLUMN refresh_claim_until INTEGER;
