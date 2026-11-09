import type { WorkspaceRuntime } from '../lifecycle/workspace-runtime'
import { providerState } from '../lifecycle/provider-state'
import { replyOrCurrentState } from '../lifecycle/workspace-actions'
import { sandboxProvider } from '../sandbox/client'
import { ProviderError } from '../sandbox/errors'
import { suspensionComputers, type ComputerScope } from './computer-data'

/** Lifecycle owners handle current resources. Detached resources still need a Stop. */
export async function stopRecordedComputers(
  runtime: WorkspaceRuntime,
  scope: ComputerScope,
  pendingWorkspaceIds: string[],
  pendingBuildIds: string[],
): Promise<void> {
  const { env, dependencies } = runtime
  const provider = sandboxProvider(env, dependencies.fetch)
  const workspaces = new Set(pendingWorkspaceIds)
  const builds = new Set(pendingBuildIds)
  for (const computer of await suspensionComputers(env.DB, scope)) {
    if (computer.currentWorkspace || computer.unfinishedBuild) continue
    let pending = computer.sandboxId === null
    if (computer.sandboxId) {
      try {
        const id = computer.sandboxId
        const reply = await replyOrCurrentState(provider, id, () =>
          provider.stop(id),
        )
        pending = providerState(reply.state) !== 'stopped'
      } catch (error) {
        pending = !(
          error instanceof ProviderError && error.kind === 'not_found'
        )
      }
    }
    if (!pending && !computer.cleanupPending) continue
    const id = computer.purposeId ?? computer.sandboxId
    if (id) (computer.purpose === 'build' ? builds : workspaces).add(id)
  }
  pendingWorkspaceIds.splice(0, pendingWorkspaceIds.length, ...workspaces)
  pendingBuildIds.splice(0, pendingBuildIds.length, ...builds)
}
