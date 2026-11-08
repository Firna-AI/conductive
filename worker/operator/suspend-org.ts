import type { OrgSuspensionResponse } from '../../src/shared/operator'
import { jobSoftware, readBuildJob } from '../lifecycle/build-data'
import { imageRuntime } from '../lifecycle/runtime'
import type { WorkspaceRuntime } from '../lifecycle/workspace-runtime'
import {
  orgBuilds,
  orgCleanupWorkspaceIds,
  orgWorkspaces,
  recordOrgSuspension,
} from './org-data'

export async function suspendOrg(
  runtime: WorkspaceRuntime,
  orgId: string,
  operatorId: string,
): Promise<OrgSuspensionResponse> {
  const { env, dependencies } = runtime
  const org = await recordOrgSuspension(
    env.DB,
    orgId,
    operatorId,
    dependencies.now(),
  )
  const pendingWorkspaceIds: string[] = []
  const suppliedWorkspaceIds = new Set<string>()
  for (const workspace of await orgWorkspaces(env.DB, orgId)) {
    suppliedWorkspaceIds.add(workspace.id)
    try {
      if (
        await runtime
          .workspace(workspace.id)
          .suspendLifecycle(workspace.id, workspace.ownerUserId)
      )
        continue
    } catch {
      // The persistent suspension also blocks every start and native alarm.
    }
    pendingWorkspaceIds.push(workspace.id)
  }
  for (const id of await orgCleanupWorkspaceIds(env.DB, orgId)) {
    if (suppliedWorkspaceIds.has(id)) continue
    suppliedWorkspaceIds.add(id)
    pendingWorkspaceIds.push(id)
  }
  const pendingBuildIds: string[] = []
  for (const build of await orgBuilds(env.DB, orgId)) {
    pendingBuildIds.push(build.id)
    try {
      const job = await readBuildJob(env.DB, orgId, build.id)
      await imageRuntime(env, dependencies).scheduler.schedule(
        orgId,
        jobSoftware(job),
        dependencies.now(),
        build.id,
      )
    } catch {
      // The saved image alarm retries cleanup after a failed wake.
    }
  }
  return { ...org, pendingWorkspaceIds, pendingBuildIds }
}
