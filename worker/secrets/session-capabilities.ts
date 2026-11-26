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
  const [grants, workspaceNames] = await Promise.all([
    secretGrants(db, workspace.orgId, workspaceId, sessionId),
    records.workspaceValueNames(),
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
  }
}
