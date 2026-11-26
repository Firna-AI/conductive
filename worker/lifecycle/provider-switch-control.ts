import type { BuildJob } from './build-data'
import { failBuild, readBuildJob, jobSoftware } from './build-data'
import { finishUnscheduledBuild } from './build-admission-data'
import { SWITCH_STOPPED_BUILD } from './build-switch-admission'
import {
  buildSwitchState,
  readOpenProviderSwitch,
  switchBuildsToStop,
  switchBuildsToPause,
  deferProviderSwitchWork,
} from './provider-switch-data'
import { switchBuildInputs } from './provider-switch-inputs'
import { progressProviderSwitch } from './provider-switch-builds'
import { advanceImageBuild, type ImageRuntime } from './image-builds'
import { promoteWaitingImageBuild } from './waiting-image-data'
import { suspendedUserError, userSuspended } from '../data/user-access'
import { suspendedOrgError } from '../data/org-access'
import { warnWorker } from '../warnings'

export async function fenceSwitchBuild(
  runtime: ImageRuntime,
  job: BuildJob,
): Promise<BuildJob> {
  if (!job.operatorSwitchId || job.state !== 'running') return job
  const state = await buildSwitchState(runtime.env.DB, job.buildId)
  const suspended =
    job.startedByUserId &&
    (await userSuspended(runtime.env.DB, job.startedByUserId))
  if (
    state?.state === 'building' &&
    state.buildId === job.buildId &&
    state.deletedAt === null &&
    state.suspendedAt === null &&
    !suspended
  )
    return job
  const wait =
    state?.deletedAt != null
      ? 'deleted'
      : state?.suspendedAt != null
        ? 'suspended'
        : suspended
          ? 'admin'
          : undefined
  await failBuild(
    runtime.env.DB,
    job.buildId,
    wait === 'deleted'
      ? 'The org was deleted.'
      : wait === 'suspended'
        ? suspendedOrgError().message
        : wait
          ? suspendedUserError().message
          : SWITCH_STOPPED_BUILD,
    runtime.dependencies.now(),
    wait ? { wait } : {},
  )
  await finishUnscheduledBuild(runtime.env.DB, job.buildId)
  return readBuildJob(runtime.env.DB, job.orgId, job.buildId)
}

export async function wakeProviderSwitch(
  runtime: ImageRuntime,
  orgId: string,
): Promise<void> {
  const item = await readOpenProviderSwitch(runtime.env.DB, orgId)
  if (!item) return
  try {
    const source = await switchBuildInputs(
      runtime.env.DB,
      orgId,
      item.fromAccount,
    )
    if (source)
      await runtime.scheduler.schedule(
        orgId,
        jobSoftware(source),
        runtime.dependencies.now(),
        null,
        item.fromAccount,
      )
    await progressProviderSwitch(runtime, orgId)
  } catch {
    await deferProviderSwitchWork(
      runtime.env.DB,
      orgId,
      runtime.dependencies.now(),
    )
    warnWorker({ kind: 'provider_switch_wake_failed' })
  }
}

export async function stopProviderSwitchBuild(
  runtime: ImageRuntime,
  orgId: string,
): Promise<void> {
  const { results } = await switchBuildsToStop(runtime.env.DB, orgId)
  for (const row of results) {
    await failBuild(
      runtime.env.DB,
      row.id,
      SWITCH_STOPPED_BUILD,
      runtime.dependencies.now(),
    )
    await finishUnscheduledBuild(runtime.env.DB, row.id)
    try {
      await advanceImageBuild(runtime, orgId, row.id)
    } catch {
      // The saved job still owns cleanup and the coordinator retries it.
    }
  }
  await promoteWaitingImageBuild(
    runtime.env.DB,
    orgId,
    runtime.dependencies.now(),
  )
}

export async function pauseSwitchBuilds(
  runtime: ImageRuntime,
  target: { orgId: string } | { userId: string },
) {
  const { results } = await switchBuildsToPause(runtime.env.DB, target)
  for (const row of results) {
    await failBuild(
      runtime.env.DB,
      row.id,
      'orgId' in target
        ? suspendedOrgError().message
        : suspendedUserError().message,
      runtime.dependencies.now(),
      { wait: 'orgId' in target ? 'suspended' : 'admin' },
    )
    await finishUnscheduledBuild(runtime.env.DB, row.id)
  }
}
