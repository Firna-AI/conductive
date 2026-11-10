import type { OrgSuspensionResponse } from '../../src/shared/operator'
import { jobSoftware, readBuildJob } from '../lifecycle/build-data'
import { imageRuntime } from '../lifecycle/runtime'
import type { WorkspaceRuntime } from '../lifecycle/workspace-runtime'
import { orgBuilds, orgWorkspaces, recordOrgSuspension } from './org-data'
import { stopRecordedComputers } from './stop-computers'

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
  for (const workspace of await orgWorkspaces(env.DB, orgId)) {
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
  await stopRecordedComputers(
    runtime,
    { kind: 'org', orgId },
    pendingWorkspaceIds,
    pendingBuildIds,
  )
  return { ...org, pendingWorkspaceIds, pendingBuildIds }
}
