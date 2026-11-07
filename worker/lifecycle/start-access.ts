import { requireActiveUser } from '../data/user-access'
import type { WorkspaceStartJob } from './start-types'
import { readWorkspace } from './workspace-data'

export async function requireActiveStartUsers(
  db: D1Database,
  job: WorkspaceStartJob,
): Promise<void> {
  if (job.creation && job.kind === 'create') {
    await requireActiveUser(db, job.creation.user.id)
    await requireActiveUser(db, job.creation.sender.id)
  } else {
    const row = await readWorkspace(db, job.orgId, job.workspaceId)
    await requireActiveUser(db, row.ownerUserId)
  }
  if (job.requestedByUserId) await requireActiveUser(db, job.requestedByUserId)
}
