import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
import { ProviderError } from '../sandbox/errors'
import { deletedOrgProvider } from './cleanup-provider'
import {
  acquireCleanupLease,
  cleanupResources,
  markOrgDeleted,
  markResourceStopped,
  orgWorkspaceIds,
  recordSuspendedResources,
  releaseCleanupLease,
  renewCleanupLease,
  restoreOrgRecords,
} from './deletion-data'
import { requireOrgAdmin } from './permissions'
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
    await stopDeletedOrg(env, orgId, token, suspended, dependencies, hooks)
  })
  return requireOrgAdmin(env.DB, orgId, actorId, true)
}

export async function restoreOrg(
  env: AppEnv,
  orgId: string,
  actorId: string,
  dependencies: AppDependencies,
  hooks: MembersHooks,
) {
  const org = await requireOrgAdmin(env.DB, orgId, actorId, true)
  if (!org.deletion) return org
  if (dependencies.now() >= org.deletion.deletesAt) throw restoreExpired()
  await withCleanupLease(env, orgId, dependencies, async (token, suspended) => {
    await stopDeletedOrg(env, orgId, token, suspended, dependencies, hooks)
    if (
      !(await restoreOrgRecords(
        env.DB,
        orgId,
        actorId,
        token,
        dependencies.now(),
      ))
    )
      throw restoreExpired()
  })
  return requireOrgAdmin(env.DB, orgId, actorId)
}

export async function withCleanupLease<T>(
  env: AppEnv,
  orgId: string,
  dependencies: AppDependencies,
  action: (token: string, suspended: boolean) => Promise<T>,
) {
  const token = dependencies.randomToken()
  const lease = await acquireCleanupLease(
    env.DB,
    orgId,
    token,
    dependencies.now(),
  )
  if (!lease) throw cleanupBusy()
  try {
    return await action(token, lease.suspendedAt !== null)
  } catch (error) {
    if (error instanceof HttpError) throw error
    throw new HttpError(
      502,
      'org_cleanup_failed',
      'The org cleanup could not finish. Try again.',
    )
  } finally {
    await releaseCleanupLease(env.DB, orgId, token)
  }
}

export async function keepCleanupLease(
  env: AppEnv,
  orgId: string,
  token: string,
  dependencies: AppDependencies,
) {
  if (!(await renewCleanupLease(env.DB, orgId, token, dependencies.now())))
    throw cleanupBusy()
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

export async function ignoreAlreadyRemoved(action: () => Promise<unknown>) {
  try {
    await action()
  } catch (error) {
    if (!(error instanceof ProviderError) || error.kind !== 'not_found')
      throw error
  }
}

function cleanupBusy() {
  return new HttpError(
    409,
    'org_cleanup_busy',
    'The org is changing. Try again.',
  )
}

function restoreExpired() {
  return new HttpError(
    409,
    'org_restore_expired',
    'The time to restore this org has ended.',
  )
}
