import type { ImageBuild } from '../../src/shared/org-settings'
import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
import {
  requireActiveOrg,
  requireActiveUser,
  userSuspended,
} from '../data/user-access'
import { orgProviderForAccount, providerForAccount } from '../sandbox/client'
import type { SandboxProvider } from '../sandbox/provider'
import { IMAGE_BUILD_TIME_LIMIT_MS, JobTimeLimit } from './job-time-limit'
import {
  providerRetryPending,
  providerRetryExpired,
  ProviderRetryExhausted,
} from './provider-retry'
import {
  progressImageRetry,
  clearImageRetryStatement,
} from './image-retry-data'
import { readSourceJob } from './image-sources/source-data'
import { imageSourceFailure } from './image-sources/materialize'
import {
  readSourceRun,
  saveSourceRunFailure,
  sourceRunFailure,
} from './image-sources/run-data'
import { advanceBuildStep } from './image-build-steps'
import { cleanupBuildImageSources } from './image-sources/cleanup'
import type { SourceCommandPort } from './image-sources/source-commands'
import { requireOrgMember } from './access'
import { jobSoftware, readBuildJob, runningBuild } from './build-data'
import { cleanupBuild } from './build-execution'
import type { ImageSoftwareArtifact } from './image-software'
import { handleImageBuildFailure } from './image-build-failure'
import { firstOrgAdmin, type SelectedRepository } from './settings-data'
import type { RepositoryLocation } from './repository-locations'
import { admitImageBuild } from './image-build-start'
import { requestBuildAfterRefresh } from './build-request'
import {
  waitingImageBuild,
  promoteWaitingImageBuild,
} from './waiting-image-data'
import { fenceSwitchBuild } from './provider-switch-control'

interface ImageScheduler {
  schedule(
    orgId: string,
    software: ImageSoftwareArtifact,
    at: number,
    buildId: string | null,
    providerAccount: string,
  ): Promise<void>
}

/** An authorized source transfer may stage private repositories without saved credentials. */
export type PrepareImageSources = (input: {
  orgId: string
  buildId: string
  sandboxId: string
  providerAccount: string
  repositories: readonly SelectedRepository[]
  repositoryLocations?: readonly RepositoryLocation[]
  previousRepositoryLocations?: readonly RepositoryLocation[]
  commands: SourceCommandPort
}) => Promise<boolean | void>

export interface ImageRuntime {
  env: AppEnv
  dependencies: AppDependencies
  scheduler: ImageScheduler
  prepareSources: PrepareImageSources
}

export async function startImageBuild(
  runtime: ImageRuntime,
  input: {
    orgId: string
    userId: string
    kind: ImageBuild['kind']
    software: ImageSoftwareArtifact
    dailyRefresh?: boolean
    /**
     * Build computer asks for this build. During a refresh, the request
     * waits on the refresh, and the build starts when it ends.
     */
    requested?: boolean
  },
): Promise<string> {
  const { env, dependencies } = runtime
  await requireActiveOrg(env.DB, input.orgId)
  await requireOrgMember(env.DB, input.orgId, input.userId, true)
  const existing = await runningBuild(env.DB, input.orgId)
  const waiting = await waitingImageBuild(env.DB, input.orgId)
  if (waiting) {
    if (!existing)
      await promoteWaitingImageBuild(env.DB, input.orgId, dependencies.now())
    const active = await runningBuild(env.DB, input.orgId)
    if (active) {
      const job = await readBuildJob(env.DB, input.orgId, active)
      await runtime.scheduler.schedule(
        input.orgId,
        jobSoftware(job),
        dependencies.now(),
        active,
        job.providerAccount,
      )
    }
    return waiting.id
  }
  const executing = existing
    ? await readBuildJob(env.DB, input.orgId, existing)
    : null
  if (executing && !executing.operatorSwitchId) {
    const job = executing
    if (
      input.requested &&
      job.kind === 'refresh' &&
      !(await requestBuildAfterRefresh(env.DB, job.buildId, input.userId)) &&
      !(await runningBuild(env.DB, input.orgId))
    )
      // The refresh ended after the first read, so the build starts now.
      return admitImageBuild(runtime, input, null)
    await runtime.scheduler.schedule(
      input.orgId,
      jobSoftware(job),
      dependencies.now(),
      job.buildId,
      job.providerAccount,
    )
    return job.buildId
  }
  return admitImageBuild(runtime, input, executing)
}

/** One durable alarm advances one job. Offsets and logs commit together in D1. */
export async function advanceImageBuild(
  runtime: ImageRuntime,
  orgId: string,
  buildId: string,
): Promise<boolean> {
  const { env, dependencies } = runtime
  const job = await fenceSwitchBuild(
    runtime,
    await readBuildJob(env.DB, orgId, buildId),
  )
  let provider: SandboxProvider | undefined
  const recoveringAllocation = job.phase === 'allocating' && !job.sandboxId
  const firstAllocation = job.phase === 'create'
  const cleaningUp = job.phase === 'cleanup' || job.state !== 'running'
  const activeWork = !recoveringAllocation && !cleaningUp
  try {
    if (job.waitingForSwitchId && job.state === 'running') {
      await requireActiveOrg(env.DB, orgId)
      if (job.startedByUserId)
        await requireActiveUser(env.DB, job.startedByUserId, orgId)
      return false
    }
    const expired =
      dependencies.now() >=
      (job.executionStartedAt ?? job.startedAt) + IMAGE_BUILD_TIME_LIMIT_MS
    if (job.phase === 'sources' && job.state === 'running' && !expired) {
      const source = await readSourceJob(env.DB, buildId)
      if (source && (source.failed || source.phase === 'abort')) {
        const run = await readSourceRun(env.DB, buildId)
        const failure = sourceRunFailure(run)
        if (run && run.failureStep === null && source.phase === 'revoke') {
          failure.sourceStep = 'copy'
          await saveSourceRunFailure(env.DB, buildId, failure)
        }
        await clearImageRetryStatement(env.DB, buildId).run()
        if (!(await cleanupBuildImageSources(env, dependencies.fetch, buildId)))
          return false
        throw imageSourceFailure(false, failure)
      }
    }
    if (activeWork) await requireActiveOrg(env.DB, orgId)
    const suspended =
      activeWork &&
      job.startedByUserId !== null &&
      (await userSuspended(env.DB, job.startedByUserId))
    if (
      !cleaningUp &&
      !expired &&
      !suspended &&
      providerRetryPending(job.providerRetry, dependencies.now())
    )
      return false
    if (
      cleaningUp &&
      !(await cleanupBuildImageSources(env, dependencies.fetch, buildId))
    )
      return false
    if (cleaningUp)
      return await cleanupBuild(
        runtime,
        providerForAccount(env, dependencies.fetch, job.providerAccount),
        job,
      )
    const admin = await firstOrgAdmin(env.DB, orgId)
    if (!admin)
      throw new HttpError(404, 'org_not_found', 'The org is not available.')
    provider = await orgProviderForAccount(
      env,
      admin.userId,
      orgId,
      dependencies.fetch,
      job.providerAccount,
    )
    if (!recoveringAllocation && job.startedByUserId)
      await requireActiveUser(env.DB, job.startedByUserId, orgId)
    if (expired) throw new JobTimeLimit('build')
    if (providerRetryExpired(job.providerRetry, dependencies.now()))
      throw new ProviderRetryExhausted()
    const done = await advanceBuildStep(runtime, provider, job)
    if (!done) await progressImageRetry(env.DB, buildId)
    return done
  } catch (error) {
    return handleImageBuildFailure(runtime, {
      orgId,
      buildId,
      provider,
      firstAllocation,
      error,
    })
  }
}
