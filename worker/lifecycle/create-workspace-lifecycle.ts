import type { WorkspacePlatform } from './workspace-platform'
import type { AppEnv, AppDependencies } from '../env'
import { DurableLifecycle } from './durable'
import type { TurnScopes } from './turns'
import type { WorkspaceEventJournal } from './durable-journal'
import {
  persistLifecycleState,
  readWorkspace,
  workspaceView,
} from './workspace-data'
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
): DurableLifecycle {
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
      changed: async (state) => {
        await persistLifecycleState(env.DB, state, dependencies.now())
        const row = await readWorkspace(env.DB, state.orgId, state.workspaceId)
        await journal.publishLifecycle(
          {
            workspace: workspaceView(row),
            start: state.start,
            error: state.error,
          },
          dependencies.now(),
        )
      },
      stop: async () => {
        await stopWorkspaceSandbox(
          await workspaceActionContext(env, dependencies, lifecycle),
        )
        await turns.clear()
      },
      keepalive: async () => {
        return keepWorkspaceDisk(
          await workspaceActionContext(env, dependencies, lifecycle),
        )
      },
      extendDeadline: async () => {
        await extendWorkspaceDeadline(
          await workspaceActionContext(env, dependencies, lifecycle),
        )
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
  return lifecycle
}
