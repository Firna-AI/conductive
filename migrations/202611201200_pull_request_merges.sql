-- One row for each merged pull request of a workspace branch, so that the
-- Stats tab of the account can count merges by owner and by UTC day.
-- The key is the GitHub repository ID and the pull request number, so that
-- a pull request counts once. The workspace ID has no foreign key, so that
-- the org purge can remove the workspaces first.
CREATE TABLE pull_request_merges (
  repository_id INTEGER NOT NULL,
  number INTEGER NOT NULL,
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL,
  owner_user_id TEXT NOT NULL REFERENCES users(id),
  merged_at INTEGER NOT NULL,
  recorded_at INTEGER NOT NULL,
  PRIMARY KEY (repository_id, number)
);
CREATE INDEX pull_request_merges_owner ON pull_request_merges(owner_user_id, merged_at);
CREATE INDEX pull_request_merges_org ON pull_request_merges(org_id);
