import {
  requireActiveOrg,
  requireActiveUser,
  requireActiveWorkspaceOwner,
} from '../data/user-access'
import type { WorkspaceStartJob } from './start-types'
import { readWorkspace } from './workspace-data'
import { firstOrgAdmin } from './settings-data'
import { orgProviderForAccount } from '../sandbox/client'
import type { AppEnv, HttpFetch } from '../env'
import { HttpError } from '../http'

export async function startProvider(
  env: AppEnv,
  fetch: HttpFetch,
  job: WorkspaceStartJob,
) {
  const admin = await firstOrgAdmin(env.DB, job.orgId)
  if (!admin)
    throw new HttpError(404, 'org_not_found', 'The org is not available.')
  return orgProviderForAccount(
    env,
    admin.userId,
    job.orgId,
    fetch,
    job.providerAccount,
  )
}

export async function requireActiveStartUsers(
  db: D1Database,
  job: WorkspaceStartJob,
): Promise<void> {
  await requireActiveOrg(db, job.orgId)
  if (job.requestedByUserId) await requireActiveUser(db, job.requestedByUserId)
  if (job.creation && job.kind === 'create') {
    await requireActiveUser(db, job.creation.sender.id)
    await requireActiveWorkspaceOwner(db, job.creation.user.id, job.orgId)
  } else {
    const row = await readWorkspace(db, job.orgId, job.workspaceId)
    await requireActiveWorkspaceOwner(db, row.ownerUserId, job.orgId)
  }
}
