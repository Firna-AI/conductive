CREATE TABLE automation_secret_preapprovals (
  org_id TEXT NOT NULL,
  automation_id TEXT NOT NULL,
  secret_id TEXT NOT NULL,
  approved_by_user_id TEXT NOT NULL,
  approved_at INTEGER NOT NULL,
  PRIMARY KEY (automation_id, secret_id),
  FOREIGN KEY (org_id, automation_id) REFERENCES automations(org_id, id) ON DELETE CASCADE,
  FOREIGN KEY (org_id, secret_id) REFERENCES org_secrets(org_id, id) ON DELETE CASCADE
);

CREATE INDEX automation_preapprovals_secret ON automation_secret_preapprovals(secret_id);
CREATE INDEX automation_preapprovals_org ON automation_secret_preapprovals(org_id, automation_id, secret_id);
