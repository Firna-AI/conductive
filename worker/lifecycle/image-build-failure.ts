import { HttpError } from '../http'
import type { SandboxProvider } from '../sandbox/provider'
import { ProviderError } from '../sandbox/errors'
import { errorSummary, warnWorker } from '../warnings'
import {
  failBuild,
  jobSoftware,
  readBuildJob,
  updateBuildJob,
} from './build-data'
import { cleanupBuild } from './build-execution'
import type { ImageRuntime } from './image-builds'
import { cleanupBuildImageSources } from './image-sources/cleanup'
import { saveImageRetry } from './image-retry-data'
import { scheduleIdleImage } from './image-schedule'
import { IMAGE_BUILD_TIME_LIMIT_MS, JobTimeLimit } from './job-time-limit'
import {
  nextProviderRetry,
  ProviderRetryExhausted,
  transientProviderError,
} from './provider-retry'

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
    dependencies.now() >= job.startedAt + IMAGE_BUILD_TIME_LIMIT_MS
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
  warnWorker(
    `Image build ${buildId} failed in phase ${job.phase}: ${errorSummary(failure)}`,
  )
  await failBuild(env.DB, buildId, message, dependencies.now())
  if (!unresolvedAllocation) await updateBuildJob(env.DB, buildId, 'cleanup')
  if (!(await cleanupBuildImageSources(env, dependencies.fetch, buildId)))
    return false
  if (!provider) {
    if (job.sandboxId || unresolvedAllocation) return false
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
