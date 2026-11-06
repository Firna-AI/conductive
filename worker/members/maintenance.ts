import type { AppDependencies, AppEnv } from '../env'
import { cleanupBusy, keepCleanupLease } from './cleanup-lease'
import { deletedOrgProvider, ignoreAlreadyRemoved } from './cleanup-provider'
import { markResourceStopped } from './deletion-data'
import type {
  DeletedOrgRetention,
  OrgMaintenanceHooks,
} from './maintenance-contract'
import {
  beginDiskRestart,
  deletedOrgDates,
  markDiskResumed,
  scheduleDisk,
  workspaceDisks,
} from './maintenance-data'

export async function maintainDeletedOrg(
  env: AppEnv,
  orgId: string,
  token: string,
  dependencies: AppDependencies,
  hooks: Pick<OrgMaintenanceHooks, 'maintainDeletedOrg'>,
  mode: 'retention' | 'restore' = 'retention',
) {
  const dates = await deletedOrgDates(env.DB, orgId)
  if (!dates) throw cleanupBusy()
  const workspaces = await workspaceDisks(env.DB, orgId)
  let open = true
  const check = async () => {
    if (!open) throw cleanupBusy()
    await keepCleanupLease(env, orgId, token, dependencies)
  }
  const retention: DeletedOrgRetention = {
    async schedule(workspaceId, nextKeepaliveAt) {
      await check()
      if (
        !Number.isFinite(nextKeepaliveAt) ||
        !workspaces.some((disk) => disk.workspaceId === workspaceId) ||
        !(await scheduleDisk(
          env.DB,
          orgId,
          token,
          workspaceId,
          nextKeepaliveAt,
        ))
      ) {
        throw new Error('The lifecycle did not preserve a valid disk deadline')
      }
    },
    async restart(workspaceId, ttlSeconds) {
      await check()
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
      await beginDiskRestart(env.DB, orgId, token, disk.sandboxId)
      try {
        await provider.resume(disk.sandboxId, {}, ttlSeconds)
        await check()
        await markDiskResumed(env.DB, orgId, workspaceId)
      } finally {
        await check()
        await ignoreAlreadyRemoved(() => provider.stop(disk.sandboxId))
        await check()
        await markResourceStopped(
          env.DB,
          orgId,
          disk.sandboxId,
          dependencies.now(),
        )
      }
      const stopped = (await workspaceDisks(env.DB, orgId)).find(
        (item) => item.workspaceId === workspaceId,
      )
      if (!stopped) throw new Error('The retained disk has no stop record')
      return { stoppedAt: stopped.stoppedAt }
    },
  }
  try {
    await hooks.maintainDeletedOrg({
      orgId,
      ...dates,
      now: dependencies.now(),
      mode,
      workspaces,
      retention,
    })
    await check()
    const current = await workspaceDisks(env.DB, orgId)
    if (
      current.length !== workspaces.length ||
      current.some(
        (disk) =>
          disk.nextKeepaliveAt === null ||
          (mode === 'retention' && disk.nextKeepaliveAt <= dependencies.now()),
      )
    ) {
      throw new Error(
        'The lifecycle left a disk without its next retention deadline',
      )
    }
  } finally {
    open = false
  }
}
