import type { UserSuspensionResponse } from '../../src/shared/operator'
import type { WorkspaceRuntime } from '../lifecycle/workspace-runtime'
import { jobSoftware, readBuildJob } from '../lifecycle/build-data'
import { imageRuntime } from '../lifecycle/runtime'
import { ownedBuilds, ownedWorkspaces, recordUserSuspension } from './data'

export async function suspendUser(
  runtime: WorkspaceRuntime,
  githubId: number,
  operatorId: string,
): Promise<UserSuspensionResponse> {
  const { env, dependencies } = runtime
  const user = await recordUserSuspension(
    env.DB,
    githubId,
    operatorId,
    dependencies.now(),
  )
  const pendingWorkspaceIds: string[] = []
  for (const workspace of await ownedWorkspaces(env.DB, user.userId)) {
    try {
      if (
        (await runtime
          .workspace(workspace.id)
          .suspendLifecycle(workspace.id, user.userId)) === true
      )
        continue
    } catch {
      // The persistent suspension also blocks the next alarm and start.
    }
    pendingWorkspaceIds.push(workspace.id)
  }
  const pendingBuildIds: string[] = []
  for (const build of await ownedBuilds(env.DB, user.userId)) {
    pendingBuildIds.push(build.id)
    try {
      const job = await readBuildJob(env.DB, build.orgId, build.id)
      await imageRuntime(env, dependencies).scheduler.schedule(
        build.orgId,
        jobSoftware(job),
        dependencies.now(),
        build.id,
      )
    } catch {
      // The existing image alarm also checks the persistent suspension.
    }
  }
  return {
    ...user,
    pendingWorkspaceIds,
    pendingBuildIds,
  }
}
