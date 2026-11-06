import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
import { keepCleanupLease, withCleanupLease } from './cleanup-lease'
import { deletedOrgProvider, ignoreAlreadyRemoved } from './cleanup-provider'
import {
  cleanupResources,
  markOrgDeleted,
  markResourceStopped,
  orgWorkspaceIds,
  recordSuspendedResources,
} from './deletion-data'
import { maintainDeletedOrg } from './maintenance'
import { requireOrgAdmin } from './permissions'
import { cancelRestoreRequest } from './restore-data'
import type { MembersHooks } from './route'

export async function deleteOrg(
  env: AppEnv,
  orgId: string,
  actorId: string,
  name: string,
  dependencies: AppDependencies,
  hooks: MembersHooks,
) {
  const org = await requireOrgAdmin(env.DB, orgId, actorId, true)
  if (name !== org.name)
    throw new HttpError(
      400,
      'org_name_mismatch',
      'Type the org name to confirm.',
    )
  if (!org.deletion) {
    if (!(await markOrgDeleted(env.DB, orgId, actorId, dependencies.now()))) {
      await requireOrgAdmin(env.DB, orgId, actorId)
    }
  }
  await withCleanupLease(env, orgId, dependencies, async (token, suspended) => {
    await requireOrgAdmin(env.DB, orgId, actorId, true)
    await cancelRestoreRequest(env.DB, orgId, token)
    await stopDeletedOrg(env, orgId, token, suspended, dependencies, hooks)
    const deleted = await requireOrgAdmin(env.DB, orgId, actorId, true)
    if (deleted.deletion && dependencies.now() < deleted.deletion.deletesAt) {
      await maintainDeletedOrg(env, orgId, token, dependencies, hooks)
    }
  })
  return requireOrgAdmin(env.DB, orgId, actorId, true)
}

export async function stopDeletedOrg(
  env: AppEnv,
  orgId: string,
  token: string,
  suspended: boolean,
  dependencies: AppDependencies,
  hooks: Pick<MembersHooks, 'suspendOrg'>,
) {
  if (!suspended) {
    await hooks.suspendOrg(orgId, await orgWorkspaceIds(env.DB, orgId))
    await keepCleanupLease(env, orgId, token, dependencies)
    await recordSuspendedResources(env.DB, orgId, token, dependencies.now())
  }
  const resources = (await cleanupResources(env.DB, orgId)).filter(
    (resource) =>
      resource.kind === 'sandbox' &&
      resource.stoppedAt === null &&
      resource.removedAt === null,
  )
  if (resources.length === 0) return
  const provider = await deletedOrgProvider(
    env,
    orgId,
    token,
    dependencies.fetch,
  )
  const failures: unknown[] = []
  for (const resource of resources) {
    await keepCleanupLease(env, orgId, token, dependencies)
    try {
      await ignoreAlreadyRemoved(() => provider.stop(resource.id))
    } catch (error) {
      failures.push(error)
      continue
    }
    await keepCleanupLease(env, orgId, token, dependencies)
    await markResourceStopped(env.DB, orgId, resource.id, dependencies.now())
  }
  if (failures.length > 0) throw failures[0]
}
