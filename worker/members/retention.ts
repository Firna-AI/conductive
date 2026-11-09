import type { AppDependencies, AppEnv } from '../env'
import { requireActiveUser, readWorkspaceAccessStop } from '../data/user-access'
import { providerForAccount } from '../sandbox/client'
import { cleanupBusy } from './cleanup-lease'
import {
  ignoreAlreadyRemoved,
  requireDeletedOrgCleanup,
} from './cleanup-provider'
import { markResourceStopped } from './deletion-data'
import type { LifecycleOwnership } from './lifecycle-contract'
import type {
  DeletedOrgMaintenance,
  DeletedOrgRetention,
  WorkspaceDisk,
} from './maintenance-contract'
import {
  beginDiskRestart,
  markDiskResumed,
  scheduleDisk,
  workspaceDisks,
} from './maintenance-data'

export function deletedOrgRetention(
  env: AppEnv,
  orgId: string,
  token: string,
  dependencies: AppDependencies,
  ownership: LifecycleOwnership,
  workspaces: readonly WorkspaceDisk[],
  mode: DeletedOrgMaintenance['mode'],
): DeletedOrgRetention {
  return {
    async schedule(workspaceId, nextKeepaliveAt) {
      await ownership.renew()
      const disk = workspaces.find((item) => item.workspaceId === workspaceId)
      if (
        !Number.isFinite(nextKeepaliveAt) ||
        !disk ||
        !(await scheduleDisk(
          env.DB,
          orgId,
          token,
          workspaceId,
          disk.sandboxId,
          disk.providerAccount,
          nextKeepaliveAt,
          ownership.generation,
          dependencies.now(),
        ))
      ) {
        throw new Error('The lifecycle did not preserve a valid disk deadline')
      }
    },
    async restart(workspaceId, ttlSeconds) {
      await ownership.renew()
      const disk = (await workspaceDisks(env.DB, orgId)).find(
        (disk) => disk.workspaceId === workspaceId,
      )
      if (
        mode !== 'retention' ||
        !disk ||
        disk.nextKeepaliveAt === null ||
        disk.nextKeepaliveAt > dependencies.now() ||
        !workspaces.some(
          (item) =>
            item.workspaceId === workspaceId &&
            item.sandboxId === disk.sandboxId &&
            item.providerAccount === disk.providerAccount,
        )
      ) {
        throw new Error('The disk is not due for controlled retention')
      }
      await requireDeletedOrgCleanup(env, orgId, token)
      const provider = providerForAccount(
        env,
        dependencies.fetch,
        disk.providerAccount,
      )
      if (
        !(await beginDiskRestart(
          env.DB,
          orgId,
          token,
          disk.sandboxId,
          disk.providerAccount,
          ownership.generation,
          dependencies.now(),
        ))
      )
        throw cleanupBusy()
      let resumeFailure: { error: unknown } | null = null
      try {
        const access = await readWorkspaceAccessStop(env.DB, workspaceId)
        if (access) await requireActiveUser(env.DB, access.ownerUserId, orgId)
        await provider.resume(disk.sandboxId, {}, ttlSeconds)
        await ownership.renew()
        if (
          !(await markDiskResumed(
            env.DB,
            orgId,
            workspaceId,
            disk.sandboxId,
            disk.providerAccount,
            token,
            ownership.generation,
            dependencies.now(),
          ))
        )
          throw cleanupBusy()
      } catch (error) {
        resumeFailure = { error }
      }
      await ownership.renew()
      await ignoreAlreadyRemoved(() => provider.stop(disk.sandboxId))
      await ownership.renew()
      if (
        !(await markResourceStopped(
          env.DB,
          orgId,
          disk.sandboxId,
          disk.providerAccount,
          dependencies.now(),
          { token, generation: ownership.generation },
        ))
      )
        throw cleanupBusy()
      if (resumeFailure) throw resumeFailure.error
      const stopped = (await workspaceDisks(env.DB, orgId)).find(
        (item) => item.workspaceId === workspaceId,
      )
      if (!stopped) throw new Error('The retained disk has no stop record')
      return { stoppedAt: stopped.stoppedAt }
    },
  }
}
