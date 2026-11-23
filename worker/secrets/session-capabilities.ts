import type { RunnerCapabilities } from '../../src/shared/generated/RunnerCapabilities'
import { secretGrants, secretWorkspaceState } from './grant-data'
import type { SecretRequestRecords } from './request-records'

export async function readSessionCapabilities(
  db: D1Database,
  records: SecretRequestRecords,
  workspaceId: string,
  sessionId: string,
): Promise<RunnerCapabilities | null> {
  const workspace = await secretWorkspaceState(db, workspaceId)
  if (!workspace) return null
  const [grants, workspaceNames, macAccess] = await Promise.all([
    secretGrants(db, workspace.orgId, workspaceId, sessionId),
    records.workspaceValueNames(),
    workspaceMacAccess(db, workspaceId),
  ])
  return {
    secrets: [
      ...new Set([
        ...grants
          .filter((secret) => secret.grant !== null)
          .map((secret) => secret.name),
        ...workspaceNames,
      ]),
    ].sort(),
    macAccess,
  }
}

async function workspaceMacAccess(
  db: D1Database,
  workspaceId: string,
): Promise<boolean> {
  const row = await db
    .prepare('SELECT mac_access AS macAccess FROM workspaces WHERE id = ?')
    .bind(workspaceId)
    .first<{ macAccess: number }>()
  return row?.macAccess === 1
}
