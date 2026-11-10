import { activeOrgPredicate } from '../data/org-access'
import type { WorkspaceTarget } from './types'
import {
  activeWorkspaceOwnerPredicate,
  sandboxAccessPredicate,
} from '../data/sandbox-access'

export interface WorkspaceAccessTarget extends WorkspaceTarget {
  ownerActive: number
  orgActive: number
  sandboxAllowed: number
}

export function readWorkspaceTarget(
  db: D1Database,
  orgId: string,
  workspaceId: string,
  userId?: string,
): Promise<WorkspaceAccessTarget | null> {
  return db
    .prepare(
      `SELECT w.org_id AS orgId, w.id AS workspaceId, w.sandbox_id AS sandboxId,
       w.provider_account AS providerAccount, w.state,
       CASE WHEN ${activeOrgPredicate('o')} THEN 1 ELSE 0 END AS orgActive,
       CASE WHEN ${activeWorkspaceOwnerPredicate} THEN 1 ELSE 0 END AS ownerActive,
       CASE WHEN ${sandboxAccessPredicate} THEN 1 ELSE 0 END AS sandboxAllowed
     FROM workspaces w JOIN orgs o ON o.id = w.org_id
     WHERE w.org_id = ? AND w.id = ? AND w.archived_at IS NULL AND o.deleted_at IS NULL
     AND (? IS NULL OR EXISTS (SELECT 1 FROM org_members m WHERE m.org_id = w.org_id AND m.user_id = ?))`,
    )
    .bind(orgId, workspaceId, userId ?? null, userId ?? null)
    .first<WorkspaceAccessTarget>()
}
