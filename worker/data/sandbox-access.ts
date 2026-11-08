import { activeOrgPredicate } from './org-access'

/** Trusted callers name the workspace table row w. */
export const activeWorkspaceOwnerPredicate = `EXISTS (
  SELECT 1 FROM users workspace_owner JOIN orgs workspace_org ON workspace_org.id = w.org_id
  WHERE workspace_owner.id = w.owner_user_id AND workspace_owner.suspended_at IS NULL
    AND ${activeOrgPredicate('workspace_org')}
)`

export const sandboxAccessPredicate = `w.archived_at IS NULL
  AND w.sandbox_id IS NOT NULL
  AND w.state IN ('ready', 'working', 'unread', 'input')
  AND EXISTS (SELECT 1 FROM orgs workspace_org WHERE workspace_org.id = w.org_id AND workspace_org.deleted_at IS NULL)
  AND ${activeWorkspaceOwnerPredicate}`
