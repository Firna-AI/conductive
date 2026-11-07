import type { AppDependencies, AppEnv } from '../env'
import { suspendedWorkspace, suspendedUserError } from '../data/user-access'
import { cleanupBusy } from './cleanup-lease'
import { deletedOrgProvider, ignoreAlreadyRemoved } from './cleanup-provider'
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
      if (
        !Number.isFinite(nextKeepaliveAt) ||
        !workspaces.some((disk) => disk.workspaceId === workspaceId) ||
        !(await scheduleDisk(
          env.DB,
          orgId,
          token,
          workspaceId,
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
        !workspaces.some((item) => item.workspaceId === workspaceId)
      ) {
        throw new Error('The disk is not due for controlled retention')
      }
      const provider = await deletedOrgProvider(
        env,
        orgId,
        token,
        dependencies.fetch,
      )
      if (
        !(await beginDiskRestart(
          env.DB,
          orgId,
          token,
          disk.sandboxId,
          ownership.generation,
          dependencies.now(),
        ))
      )
        throw cleanupBusy()
      let resumeFailure: { error: unknown } | null = null
      try {
        if (await suspendedWorkspace(env.DB, workspaceId))
          throw suspendedUserError()
        await provider.resume(disk.sandboxId, {}, ttlSeconds)
        await ownership.renew()
        if (
          !(await markDiskResumed(
            env.DB,
            orgId,
            workspaceId,
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
