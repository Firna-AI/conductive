import type { AppDependencies, AppEnv } from '../env'
import {
  cleanupBusy,
  keepCleanupLease,
  withCleanupLease,
} from './cleanup-lease'
import { deletedOrgProvider, ignoreAlreadyRemoved } from './cleanup-provider'
import { stopDeletedOrg } from './deletion'
import {
  cleanupResources,
  deletedOrgs,
  markPurgeStarted,
  markResourceRemoved,
} from './deletion-data'
import { maintainDeletedOrg } from './maintenance'
import { runLifecycleHook } from './lifecycle-runner'
import {
  markWorkspaceStateDeleted,
  pendingWorkspaceStates,
  purgeOrgRecords,
} from './purge-data'
import { finishPendingRestore } from './restore'
import type { MembersHooks } from './route'

export async function cleanupDeletedOrgs(
  env: AppEnv,
  dependencies: AppDependencies,
  hooks: Omit<MembersHooks, 'readWorkspace'>,
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
          if (dependencies.now() < org.deletesAt) {
            await maintainDeletedOrg(env, org.id, token, dependencies, hooks)
            await finishPendingRestore(env, org.id, token, dependencies, hooks)
            return
          }
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
            const completed = await runLifecycleHook(
              env,
              org.id,
              token,
              dependencies,
              (ownership) =>
                hooks.deleteWorkspaceState(org.id, workspace.id, ownership),
            )
            if (
              !(await markWorkspaceStateDeleted(
                env.DB,
                org.id,
                workspace.id,
                token,
                completed.generation,
                dependencies.now(),
              ))
            )
              throw cleanupBusy()
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
