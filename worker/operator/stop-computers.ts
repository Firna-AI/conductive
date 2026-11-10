import type { WorkspaceRuntime } from '../lifecycle/workspace-runtime'
import { workspaceBinding } from '../app-api/workspace-state'
import { computerStopObjectName } from '../lifecycle/computer-stop-task'
import { suspensionComputers, type ComputerScope } from './computer-data'

/** Lifecycle owners handle current resources. Detached resources still need a Stop. */
export async function stopRecordedComputers(
  runtime: WorkspaceRuntime,
  scope: ComputerScope,
  pendingWorkspaceIds: string[],
  pendingBuildIds: string[],
): Promise<void> {
  const { env } = runtime
  const workspaces = new Set(pendingWorkspaceIds)
  const builds = new Set(pendingBuildIds)
  const computers = (await suspensionComputers(env.DB, scope)).filter(
    (computer) => !computer.currentWorkspace && !computer.unfinishedBuild,
  )
  const orgs = new Map<string, string[]>()
  for (const computer of computers) {
    if (!computer.sandboxId) continue
    const ids = orgs.get(computer.orgId) ?? []
    ids.push(computer.sandboxId)
    orgs.set(computer.orgId, ids)
  }
  const pending = new Set<string>()
  for (const [orgId, ids] of orgs) {
    const remaining = await workspaceBinding(env)
      .getByName(computerStopObjectName(orgId), { locationHint: 'weur' })
      .queueComputerStops(orgId, ids)
    for (const id of remaining) pending.add(id)
  }
  for (const computer of computers) {
    if (
      computer.sandboxId &&
      !pending.has(computer.sandboxId) &&
      !computer.cleanupPending
    )
      continue
    const id = computer.purposeId ?? computer.sandboxId
    if (id) (computer.purpose === 'build' ? builds : workspaces).add(id)
  }
  pendingWorkspaceIds.splice(0, pendingWorkspaceIds.length, ...workspaces)
  pendingBuildIds.splice(0, pendingBuildIds.length, ...builds)
}
