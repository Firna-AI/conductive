CREATE TABLE computer_ledger (
  id INTEGER PRIMARY KEY,
  allocation_key TEXT,
  sandbox_id TEXT,
  provider_account TEXT NOT NULL DEFAULT 'boat',
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  owner_user_id TEXT,
  purpose TEXT NOT NULL CHECK (purpose IN ('workspace', 'build', 'retained')),
  purpose_id TEXT,
  cleanup_pending INTEGER NOT NULL DEFAULT 0 CHECK (cleanup_pending IN (0, 1)),
  create_rejected INTEGER NOT NULL DEFAULT 0 CHECK (create_rejected IN (0, 1)),
  deleted_at INTEGER,
  UNIQUE (provider_account, allocation_key),
  UNIQUE (provider_account, sandbox_id)
);
CREATE INDEX computer_ledger_org_live ON computer_ledger(org_id, deleted_at);
CREATE INDEX computer_ledger_owner_live ON computer_ledger(owner_user_id, deleted_at);
CREATE INDEX computer_ledger_purpose ON computer_ledger(purpose, purpose_id);

-- Keep known parents first. A historical reference can lack its original owner.
INSERT OR IGNORE INTO computer_ledger (sandbox_id, provider_account, org_id, owner_user_id, purpose, purpose_id)
SELECT sandbox_id, provider_account, org_id, owner_user_id, 'workspace', id
FROM workspaces WHERE sandbox_id IS NOT NULL;

INSERT OR IGNORE INTO computer_ledger (sandbox_id, provider_account, org_id, owner_user_id, purpose, purpose_id)
SELECT sandbox_id, provider_account, org_id, started_by_user_id, 'build', id
FROM image_builds WHERE sandbox_id IS NOT NULL;

INSERT OR IGNORE INTO computer_ledger (sandbox_id, provider_account, org_id, owner_user_id, purpose, purpose_id)
SELECT c.sandbox_id, c.provider_account, c.org_id, COALESCE(w.owner_user_id, p.owner_user_id), 'workspace', c.workspace_id
FROM lifecycle_sandbox_cleanup c
LEFT JOIN workspaces w ON w.id = c.workspace_id AND w.org_id = c.org_id
LEFT JOIN workspace_creation_plans p ON p.workspace_id = c.workspace_id;

UPDATE computer_ledger SET cleanup_pending = 1
WHERE EXISTS (SELECT 1 FROM lifecycle_sandbox_cleanup c
  WHERE c.sandbox_id = computer_ledger.sandbox_id AND c.provider_account = computer_ledger.provider_account);

INSERT OR IGNORE INTO computer_ledger (sandbox_id, provider_account, org_id, owner_user_id, purpose, purpose_id)
SELECT p.listener_sandbox_id, p.provider_account, p.org_id, w.owner_user_id, 'workspace', p.workspace_id
FROM preview_hostnames p JOIN workspaces w ON w.id = p.workspace_id
WHERE p.listener_sandbox_id IS NOT NULL;

INSERT OR IGNORE INTO computer_ledger (sandbox_id, provider_account, org_id, owner_user_id, purpose, purpose_id)
SELECT t.sandbox_id, t.provider_account, w.org_id, w.owner_user_id, 'workspace', t.workspace_id
FROM terminal_credentials t JOIN workspaces w ON w.id = t.workspace_id
WHERE t.sandbox_id IS NOT NULL;

INSERT OR IGNORE INTO computer_ledger (sandbox_id, provider_account, org_id, owner_user_id, purpose, purpose_id)
SELECT s.sandbox_id, s.provider_account, s.org_id, b.started_by_user_id, 'build', s.build_id
FROM image_source_jobs s JOIN orgs o ON o.id = s.org_id
LEFT JOIN image_builds b ON b.id = s.build_id AND b.org_id = s.org_id;

INSERT OR IGNORE INTO computer_ledger (sandbox_id, provider_account, org_id, purpose, deleted_at)
SELECT resource_id, provider_account, org_id, 'retained', removed_at
FROM org_deletion_resources WHERE kind = 'sandbox';

UPDATE computer_ledger SET deleted_at = (
  SELECT r.removed_at FROM org_deletion_resources r
  WHERE r.org_id = computer_ledger.org_id AND r.kind = 'sandbox'
    AND r.resource_id = computer_ledger.sandbox_id
    AND r.provider_account = computer_ledger.provider_account AND r.removed_at IS NOT NULL
)
WHERE EXISTS (
  SELECT 1 FROM org_deletion_resources r
  WHERE r.org_id = computer_ledger.org_id AND r.kind = 'sandbox'
    AND r.resource_id = computer_ledger.sandbox_id
    AND r.provider_account = computer_ledger.provider_account AND r.removed_at IS NOT NULL
);

UPDATE computer_ledger SET cleanup_pending = 0 WHERE deleted_at IS NOT NULL;

-- Record assigned identities too, including imports and repairs of older records.
-- These triggers never clear a confirmed deletion or remove a historical entry.
-- Explicit existence checks keep the outer write's conflict policy out of the ledger.
CREATE TRIGGER computer_ledger_workspace_insert AFTER INSERT ON workspaces
WHEN NEW.sandbox_id IS NOT NULL BEGIN
  INSERT INTO computer_ledger (sandbox_id, provider_account, org_id, owner_user_id, purpose, purpose_id)
  SELECT NEW.sandbox_id, NEW.provider_account, NEW.org_id, NEW.owner_user_id, 'workspace', NEW.id
  WHERE NOT EXISTS (SELECT 1 FROM computer_ledger WHERE sandbox_id = NEW.sandbox_id AND provider_account = NEW.provider_account);
END;

CREATE TRIGGER computer_ledger_workspace_sandbox AFTER UPDATE OF sandbox_id, provider_account ON workspaces
WHEN NEW.sandbox_id IS NOT NULL BEGIN
  INSERT INTO computer_ledger (sandbox_id, provider_account, org_id, owner_user_id, purpose, purpose_id)
  SELECT NEW.sandbox_id, NEW.provider_account, NEW.org_id, NEW.owner_user_id, 'workspace', NEW.id
  WHERE NOT EXISTS (SELECT 1 FROM computer_ledger WHERE sandbox_id = NEW.sandbox_id AND provider_account = NEW.provider_account);
END;

CREATE TRIGGER computer_ledger_workspace_owner AFTER UPDATE OF owner_user_id ON workspaces BEGIN
  UPDATE computer_ledger SET owner_user_id = NEW.owner_user_id
  WHERE org_id = NEW.org_id AND purpose = 'workspace' AND purpose_id = NEW.id AND deleted_at IS NULL;
END;

CREATE TRIGGER computer_ledger_build_insert AFTER INSERT ON image_builds
WHEN NEW.sandbox_id IS NOT NULL BEGIN
  INSERT INTO computer_ledger (sandbox_id, provider_account, org_id, owner_user_id, purpose, purpose_id)
  SELECT NEW.sandbox_id, NEW.provider_account, NEW.org_id, NEW.started_by_user_id, 'build', NEW.id
  WHERE NOT EXISTS (SELECT 1 FROM computer_ledger WHERE sandbox_id = NEW.sandbox_id AND provider_account = NEW.provider_account);
END;

CREATE TRIGGER computer_ledger_build_sandbox AFTER UPDATE OF sandbox_id, provider_account ON image_builds
WHEN NEW.sandbox_id IS NOT NULL BEGIN
  INSERT INTO computer_ledger (sandbox_id, provider_account, org_id, owner_user_id, purpose, purpose_id)
  SELECT NEW.sandbox_id, NEW.provider_account, NEW.org_id, NEW.started_by_user_id, 'build', NEW.id
  WHERE NOT EXISTS (SELECT 1 FROM computer_ledger WHERE sandbox_id = NEW.sandbox_id AND provider_account = NEW.provider_account);
END;

CREATE TRIGGER computer_ledger_cleanup_insert AFTER INSERT ON lifecycle_sandbox_cleanup BEGIN
  INSERT INTO computer_ledger (sandbox_id, provider_account, org_id, owner_user_id, purpose, purpose_id)
  SELECT NEW.sandbox_id, NEW.provider_account, NEW.org_id, COALESCE(
    (SELECT owner_user_id FROM workspaces WHERE id = NEW.workspace_id AND org_id = NEW.org_id),
    (SELECT owner_user_id FROM workspace_creation_plans WHERE workspace_id = NEW.workspace_id)
  ), 'workspace', NEW.workspace_id
  WHERE NOT EXISTS (SELECT 1 FROM computer_ledger WHERE sandbox_id = NEW.sandbox_id AND provider_account = NEW.provider_account);
  UPDATE computer_ledger SET cleanup_pending = 1
  WHERE sandbox_id = NEW.sandbox_id AND provider_account = NEW.provider_account AND deleted_at IS NULL;
END;

CREATE TRIGGER computer_ledger_cleanup_update AFTER UPDATE OF sandbox_id, provider_account ON lifecycle_sandbox_cleanup BEGIN
  INSERT INTO computer_ledger (sandbox_id, provider_account, org_id, owner_user_id, purpose, purpose_id)
  SELECT NEW.sandbox_id, NEW.provider_account, NEW.org_id, COALESCE(
    (SELECT owner_user_id FROM workspaces WHERE id = NEW.workspace_id AND org_id = NEW.org_id),
    (SELECT owner_user_id FROM workspace_creation_plans WHERE workspace_id = NEW.workspace_id)
  ), 'workspace', NEW.workspace_id
  WHERE NOT EXISTS (SELECT 1 FROM computer_ledger WHERE sandbox_id = NEW.sandbox_id AND provider_account = NEW.provider_account);
  UPDATE computer_ledger SET cleanup_pending = 1
  WHERE sandbox_id = NEW.sandbox_id AND provider_account = NEW.provider_account AND deleted_at IS NULL;
END;

CREATE TRIGGER computer_ledger_preview_insert AFTER INSERT ON preview_hostnames
WHEN NEW.listener_sandbox_id IS NOT NULL BEGIN
  INSERT INTO computer_ledger (sandbox_id, provider_account, org_id, owner_user_id, purpose, purpose_id)
  SELECT NEW.listener_sandbox_id, NEW.provider_account, NEW.org_id, owner_user_id, 'workspace', NEW.workspace_id
  FROM workspaces WHERE id = NEW.workspace_id AND org_id = NEW.org_id
    AND NOT EXISTS (SELECT 1 FROM computer_ledger WHERE sandbox_id = NEW.listener_sandbox_id AND provider_account = NEW.provider_account);
END;

CREATE TRIGGER computer_ledger_preview_update AFTER UPDATE OF listener_sandbox_id, provider_account ON preview_hostnames
WHEN NEW.listener_sandbox_id IS NOT NULL BEGIN
  INSERT INTO computer_ledger (sandbox_id, provider_account, org_id, owner_user_id, purpose, purpose_id)
  SELECT NEW.listener_sandbox_id, NEW.provider_account, NEW.org_id, owner_user_id, 'workspace', NEW.workspace_id
  FROM workspaces WHERE id = NEW.workspace_id AND org_id = NEW.org_id
    AND NOT EXISTS (SELECT 1 FROM computer_ledger WHERE sandbox_id = NEW.listener_sandbox_id AND provider_account = NEW.provider_account);
END;

CREATE TRIGGER computer_ledger_terminal_insert AFTER INSERT ON terminal_credentials
WHEN NEW.sandbox_id IS NOT NULL BEGIN
  INSERT INTO computer_ledger (sandbox_id, provider_account, org_id, owner_user_id, purpose, purpose_id)
  SELECT NEW.sandbox_id, NEW.provider_account, org_id, owner_user_id, 'workspace', NEW.workspace_id
  FROM workspaces WHERE id = NEW.workspace_id
    AND NOT EXISTS (SELECT 1 FROM computer_ledger WHERE sandbox_id = NEW.sandbox_id AND provider_account = NEW.provider_account);
END;

CREATE TRIGGER computer_ledger_terminal_update AFTER UPDATE OF sandbox_id, provider_account ON terminal_credentials
WHEN NEW.sandbox_id IS NOT NULL BEGIN
  INSERT INTO computer_ledger (sandbox_id, provider_account, org_id, owner_user_id, purpose, purpose_id)
  SELECT NEW.sandbox_id, NEW.provider_account, org_id, owner_user_id, 'workspace', NEW.workspace_id
  FROM workspaces WHERE id = NEW.workspace_id
    AND NOT EXISTS (SELECT 1 FROM computer_ledger WHERE sandbox_id = NEW.sandbox_id AND provider_account = NEW.provider_account);
END;

CREATE TRIGGER computer_ledger_source_insert AFTER INSERT ON image_source_jobs
WHEN EXISTS (SELECT 1 FROM orgs WHERE id = NEW.org_id) BEGIN
  INSERT INTO computer_ledger (sandbox_id, provider_account, org_id, owner_user_id, purpose, purpose_id)
  SELECT NEW.sandbox_id, NEW.provider_account, NEW.org_id,
    (SELECT started_by_user_id FROM image_builds WHERE id = NEW.build_id AND org_id = NEW.org_id),
    'build', NEW.build_id
  WHERE NOT EXISTS (SELECT 1 FROM computer_ledger WHERE sandbox_id = NEW.sandbox_id AND provider_account = NEW.provider_account);
END;

CREATE TRIGGER computer_ledger_source_update AFTER UPDATE OF sandbox_id, provider_account ON image_source_jobs
WHEN EXISTS (SELECT 1 FROM orgs WHERE id = NEW.org_id) BEGIN
  INSERT INTO computer_ledger (sandbox_id, provider_account, org_id, owner_user_id, purpose, purpose_id)
  SELECT NEW.sandbox_id, NEW.provider_account, NEW.org_id,
    (SELECT started_by_user_id FROM image_builds WHERE id = NEW.build_id AND org_id = NEW.org_id),
    'build', NEW.build_id
  WHERE NOT EXISTS (SELECT 1 FROM computer_ledger WHERE sandbox_id = NEW.sandbox_id AND provider_account = NEW.provider_account);
END;

CREATE TRIGGER computer_ledger_deletion_insert AFTER INSERT ON org_deletion_resources
WHEN NEW.kind = 'sandbox' BEGIN
  INSERT INTO computer_ledger (sandbox_id, provider_account, org_id, purpose, deleted_at)
  SELECT NEW.resource_id, NEW.provider_account, NEW.org_id, 'retained', NEW.removed_at
  WHERE NOT EXISTS (SELECT 1 FROM computer_ledger WHERE sandbox_id = NEW.resource_id AND provider_account = NEW.provider_account);
END;

CREATE TRIGGER computer_ledger_deletion_update AFTER UPDATE OF resource_id, provider_account ON org_deletion_resources
WHEN NEW.kind = 'sandbox' BEGIN
  INSERT INTO computer_ledger (sandbox_id, provider_account, org_id, purpose, deleted_at)
  SELECT NEW.resource_id, NEW.provider_account, NEW.org_id, 'retained', NEW.removed_at
  WHERE NOT EXISTS (SELECT 1 FROM computer_ledger WHERE sandbox_id = NEW.resource_id AND provider_account = NEW.provider_account);
END;
