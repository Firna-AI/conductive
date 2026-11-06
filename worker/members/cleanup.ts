import type { AppDependencies, AppEnv } from '../env'
import { deletedOrgProvider } from './cleanup-provider'
import {
  ignoreAlreadyRemoved,
  keepCleanupLease,
  stopDeletedOrg,
  withCleanupLease,
} from './deletion'
import {
  cleanupResources,
  deletedOrgs,
  markPurgeStarted,
  markResourceRemoved,
} from './deletion-data'
import {
  markWorkspaceStateDeleted,
  pendingWorkspaceStates,
  purgeOrgRecords,
} from './purge-data'
import type { MembersHooks } from './route'

export async function cleanupDeletedOrgs(
  env: AppEnv,
  dependencies: AppDependencies,
  hooks: Pick<MembersHooks, 'suspendOrg' | 'deleteWorkspaceState'>,
): Promise<{ purged: string[]; pending: string[] }> {
  const result: { purged: string[]; pending: string[] } = {
    purged: [],
    pending: [],
  }
  for (const org of (await deletedOrgs(env.DB)).results) {
    try {
      await withCleanupLease(
        env,
        org.id,
        dependencies,
        async (token, suspended) => {
          await stopDeletedOrg(
            env,
            org.id,
            token,
            suspended,
            dependencies,
            hooks,
          )
          if (dependencies.now() < org.deletesAt) return
          if (
            !(await markPurgeStarted(env.DB, org.id, token, dependencies.now()))
          )
            throw new Error('Org purge claim was lost')
          const resources = (await cleanupResources(env.DB, org.id)).filter(
            (resource) => resource.removedAt === null,
          )
          if (resources.length > 0) {
            const provider = await deletedOrgProvider(
              env,
              org.id,
              token,
              dependencies.fetch,
            )
            // Snapshot names sort before sandbox IDs, so every snapshot is gone before any sandbox delete.
            for (const resource of resources) {
              await keepCleanupLease(env, org.id, token, dependencies)
              await ignoreAlreadyRemoved(() =>
                resource.kind === 'snapshot'
                  ? provider.deleteSnapshot(resource.id)
                  : provider.delete(resource.id),
              )
              await keepCleanupLease(env, org.id, token, dependencies)
              await markResourceRemoved(
                env.DB,
                org.id,
                resource,
                dependencies.now(),
              )
            }
          }
          for (const workspace of await pendingWorkspaceStates(
            env.DB,
            org.id,
          )) {
            await keepCleanupLease(env, org.id, token, dependencies)
            await hooks.deleteWorkspaceState(org.id, workspace.id)
            await keepCleanupLease(env, org.id, token, dependencies)
            await markWorkspaceStateDeleted(
              env.DB,
              org.id,
              workspace.id,
              dependencies.now(),
            )
          }
          if (!(await purgeOrgRecords(env.DB, org.id, token)))
            throw new Error('Org purge claim was lost')
          result.purged.push(org.id)
        },
      )
    } catch {
      result.pending.push(org.id)
    }
  }
  return result
}
