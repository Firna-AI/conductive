import type { WorkspacePlatform } from './workspace-platform'
import type { AppEnv, AppDependencies } from '../env'
import { DurableLifecycle } from './durable'
import type { TurnScopes } from './turns'
import type { WorkspaceEventJournal } from './durable-journal'
import { readWorkspace } from './workspace-data'
import { WorkspaceStateProjection } from './workspace-state-projection'
import {
  extendWorkspaceDeadline,
  stopWorkspaceSandbox,
  reconcileWorkspaceSandbox,
  workspaceActionContext,
} from './workspace-actions'
import { keepWorkspaceDisk } from './disk-retention'

export function createWorkspaceLifecycle(
  ctx: WorkspacePlatform,
  env: AppEnv,
  dependencies: AppDependencies,
  turns: TurnScopes,
  journal: WorkspaceEventJournal,
) {
  const lifecycle: DurableLifecycle = new DurableLifecycle(
    {
      get: (key) => ctx.storage.get('lifecycle', key),
      put: (key, state) => ctx.storage.put('lifecycle', key, state),
      delete: (key) => ctx.storage.delete(key),
      setAlarm: (at) => ctx.storage.setAlarm(at),
      deleteAlarm: () => ctx.storage.deleteAlarm(),
    },
    dependencies.now,
    {
      changed: async (state, publish) => {
        await projection.changed(publish)
        if (state.state === 'stopped' || state.state === 'error')
          await ctx.stopped?.(state.workspaceId)
      },
      stop: async () => {
        const result = await stopWorkspaceSandbox(
          await workspaceActionContext(env, dependencies, lifecycle),
        )
        if (result !== 'pending') await turns.clear()
        return result
      },
      keepalive: async () => {
        return keepWorkspaceDisk(
          await workspaceActionContext(env, dependencies, lifecycle),
        )
      },
      extendDeadline: async () => {
        const result = await extendWorkspaceDeadline(
          await workspaceActionContext(env, dependencies, lifecycle),
        )
        if (result) await turns.clear()
        return result
      },
      reconcile: async () => {
        const state = await lifecycle.read()
        if (!state) return undefined
        const row = await readWorkspace(env.DB, state.orgId, state.workspaceId)
        if (!row.sandboxId) return undefined
        const result = await reconcileWorkspaceSandbox(
          await workspaceActionContext(env, dependencies, lifecycle),
        )
        if (result) await turns.clear()
        return result
      },
      startPending: async () =>
        Boolean(await ctx.storage.get('job', 'lifecycle:start-job')),
    },
  )
  const projection = new WorkspaceStateProjection({
    env,
    dependencies,
    journal,
    readLifecycle: () => lifecycle.read(),
    deviceWaiting: async (id) => (await ctx.deviceWaiting?.(id)) ?? false,
  })
  return { lifecycle, projection }
}
