import {
  requireActiveUser,
  requireActiveWorkspaceOwner,
} from '../data/user-access'
import type { WorkspaceStartJob } from './start-types'
import { readWorkspace } from './workspace-data'

export async function requireActiveStartUsers(
  db: D1Database,
  job: WorkspaceStartJob,
): Promise<void> {
  if (job.requestedByUserId) await requireActiveUser(db, job.requestedByUserId)
  if (job.creation && job.kind === 'create') {
    await requireActiveUser(db, job.creation.sender.id)
    await requireActiveWorkspaceOwner(db, job.creation.user.id)
  } else {
    const row = await readWorkspace(db, job.orgId, job.workspaceId)
    await requireActiveWorkspaceOwner(db, row.ownerUserId)
  }
}
