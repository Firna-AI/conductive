import { HttpError } from '../http'
import { finishUnscheduledBuild } from './build-admission-data'
import type { SandboxProvider } from '../sandbox/provider'
import { ProviderError } from '../sandbox/errors'
import { warnWorker } from '../warnings'
import { errorSummary, WarningId } from '../warning-values'
import {
  failBuild,
  jobSoftware,
  readBuildJob,
  updateBuildJob,
} from './build-data'
import { cleanupBuild } from './build-execution'
import type { ImageRuntime } from './image-builds'
import { cleanupBuildImageSources } from './image-sources/cleanup'
import { ImageSourceFailure } from './image-sources/materialize'
import { readSourceRun, sourceRunFailure } from './image-sources/run-data'
import { saveImageRetry } from './image-retry-data'
import { scheduleIdleImage } from './image-schedule'
import { IMAGE_BUILD_TIME_LIMIT_MS, JobTimeLimit } from './job-time-limit'
import {
  nextProviderRetry,
  ProviderRetryExhausted,
  transientProviderError,
} from './provider-retry'
import { liveBuildComputers } from './computer-ledger'
import { switchBuildFailureCause } from './provider-switch-end'

export async function failUnscheduledBuild(
  runtime: ImageRuntime,
  buildId: string,
): Promise<void> {
  await failBuild(
    runtime.env.DB,
    buildId,
    'The cloud computer build could not start. Try again.',
    runtime.dependencies.now(),
  )
  await finishUnscheduledBuild(runtime.env.DB, buildId)
}

export async function handleImageBuildFailure(
  runtime: ImageRuntime,
  input: {
    orgId: string
    buildId: string
    provider: SandboxProvider | undefined
    firstAllocation: boolean
    error: unknown
  },
): Promise<boolean> {
  const { env, dependencies } = runtime
  const { orgId, buildId, provider, firstAllocation, error } = input
  const job = await readBuildJob(env.DB, orgId, buildId)
  if (job.phase === 'cleanup' || job.state !== 'running') throw error
  const suspended =
    error instanceof HttpError &&
    ['user_suspended', 'org_suspended'].includes(error.code)
  const failure =
    !suspended &&
    dependencies.now() >=
      (job.executionStartedAt ?? job.startedAt) + IMAGE_BUILD_TIME_LIMIT_MS
      ? new JobTimeLimit('build')
      : error
  const retry = nextProviderRetry(
    job.providerRetry,
    failure,
    dependencies.now(),
  )
  if (retry) {
    await saveImageRetry(env.DB, buildId, retry)
    return false
  }
  if (
    provider &&
    job.phase === 'allocating' &&
    !job.sandboxId &&
    !suspended &&
    !(failure instanceof ProviderRetryExhausted) &&
    !(failure instanceof JobTimeLimit) &&
    !(failure instanceof ProviderError)
  )
    return false
  const message =
    failure instanceof HttpError
      ? failure.message
      : 'The cloud computer image could not build. Check the log and try again.'
  const unresolvedAllocation =
    job.phase === 'allocating' &&
    !job.sandboxId &&
    !(
      firstAllocation &&
      error instanceof ProviderError &&
      !transientProviderError(error)
    )
  const sourceFailure =
    job.phase !== 'sources'
      ? null
      : error instanceof ImageSourceFailure
        ? error
        : failure instanceof JobTimeLimit
          ? sourceRunFailure(await readSourceRun(env.DB, buildId))
          : null
  warnWorker({
    kind: 'image_build_failed',
    buildId: WarningId.checked(buildId),
    phase: job.phase,
    sourceStep:
      sourceFailure?.sourceStep ?? (job.phase === 'sources' ? 'unknown' : null),
    githubStatus: sourceFailure?.githubStatus ?? null,
    error: errorSummary(failure),
  })
  await failBuild(env.DB, buildId, message, dependencies.now(), {
    cause: switchBuildFailureCause(failure),
    wait: suspended
      ? failure instanceof HttpError && failure.code === 'org_suspended'
        ? 'suspended'
        : 'admin'
      : undefined,
  })
  if (!unresolvedAllocation) await updateBuildJob(env.DB, buildId, 'cleanup')
  if (!(await cleanupBuildImageSources(env, dependencies.fetch, buildId)))
    return false
  if (!provider) {
    if (
      job.sandboxId ||
      unresolvedAllocation ||
      (await liveBuildComputers(env.DB, job.orgId, job.buildId)).length > 0
    )
      return false
    await updateBuildJob(env.DB, buildId, 'done')
    await scheduleIdleImage(runtime, orgId, jobSoftware(job))
    return true
  }
  return await cleanupBuild(
    runtime,
    provider,
    await readBuildJob(env.DB, orgId, buildId),
  )
}
