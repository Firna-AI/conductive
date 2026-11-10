import { captureUnexpectedWorkerFailure } from '../error-reporting/policy'
import type { UserSuspensionResponse } from '../../src/shared/operator'
import type { WorkspaceRuntime } from '../lifecycle/workspace-runtime'
import { jobSoftware, readBuildJob } from '../lifecycle/build-data'
import { imageRuntime } from '../lifecycle/runtime'
import { ownedBuilds, ownedWorkspaces, recordUserSuspension } from './data'
import { stopRecordedComputers } from './stop-computers'

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
    } catch (error) {
      captureUnexpectedWorkerFailure('operator_lifecycle_failed', error)
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
    } catch (error) {
      captureUnexpectedWorkerFailure('operator_lifecycle_failed', error)
      // The existing image alarm also checks the persistent suspension.
    }
  }
  await stopRecordedComputers(
    runtime,
    { kind: 'user', userId: user.userId },
    pendingWorkspaceIds,
    pendingBuildIds,
  )
  return {
    ...user,
    pendingWorkspaceIds,
    pendingBuildIds,
  }
}
