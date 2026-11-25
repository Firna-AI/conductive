import type { AppDependencies, AppEnv } from '../../env'
import type { CommandStatus } from '../../sandbox/provider'
import type { PrepareImageSources } from '../image-builds'
import { transientProviderError } from '../provider-retry'
import {
  legacyRepositoryLocations,
  repositoryLocation,
} from '../repository-locations'
import { revokeSourceToken } from './cleanup'
import { finishSourceCopy } from './copy-data'
import { startSourceCopy } from './copy'
import { ImageSourceStepError, sourceCommandFailure } from './failure'
import { finalizeSourceCommand } from './native-command'
import { completeRunPhase, type SourceRun } from './run-data'
import { refusedSourceStart } from './source-commands'
import {
  buildSourceJobs,
  saveSourceStatus,
  setSourcePhase,
  type SourceJob,
} from './source-data'

export function sourceCommandSucceeded(status: CommandStatus): boolean {
  return (
    status.state === 'exited' &&
    status.exitCode === 0 &&
    status.timedOut !== true
  )
}

function throwSourceErrors(results: PromiseSettledResult<void>[]) {
  const failures = results.filter(
    (result): result is PromiseRejectedResult => result.status === 'rejected',
  )
  const failure =
    failures.find((result) => !transientProviderError(result.reason)) ??
    failures[0]
  if (failure) throw failure.reason
}

async function pollSource(
  env: AppEnv,
  dependencies: Pick<AppDependencies, 'fetch' | 'now'>,
  input: Parameters<PrepareImageSources>[0],
  job: SourceJob,
) {
  if (job.phase.endsWith('-starting'))
    throw new ImageSourceStepError('interrupted')
  if (job.failed && job.phase === 'revoke')
    throw new ImageSourceStepError('copy')
  if (job.failed || job.phase === 'abort')
    throw new Error('The source command failed')
  if (job.phase === 'fetch' || job.phase === 'finalize') {
    if (job.processId === null) throw new ImageSourceStepError('interrupted')
    const status = await input.commands
      .status(job.processId, job)
      .catch((error: unknown) => {
        throw sourceCommandFailure(error, 'copy')
      })
    await saveSourceStatus(env.DB, job.buildId, status, job.sourceIndex)
    if (status.running) return
    if (job.phase === 'finalize') {
      if (!sourceCommandSucceeded(status))
        throw new ImageSourceStepError('copy')
      await setSourcePhase(env.DB, job.buildId, 'done', null, job.sourceIndex)
      return
    }
    const current = (await buildSourceJobs(env.DB, job.buildId)).find(
      (source) => source.sourceIndex === job.sourceIndex,
    )
    if (!current) throw new Error('Missing source ownership')
    const succeeded = sourceCommandSucceeded(status) && !current.grantHash
    await finishSourceCopy(
      env.DB,
      current,
      input.repositories[current.sourceIndex]?.fullName,
      succeeded,
      dependencies.now(),
    )
    const revoked = await revokeSourceToken(env, dependencies.fetch, current)
    if (!succeeded) throw new ImageSourceStepError('copy')
    if (revoked)
      await setSourcePhase(
        env.DB,
        job.buildId,
        'finalize-ready',
        null,
        job.sourceIndex,
      )
    return
  }
  if (job.phase === 'revoke' || job.phase === 'retry-revoke') {
    if (!(await revokeSourceToken(env, dependencies.fetch, job))) return
    await setSourcePhase(
      env.DB,
      job.buildId,
      job.phase === 'retry-revoke' ? 'ready' : 'finalize-ready',
      null,
      job.sourceIndex,
    )
  }
}

async function startFinalize(
  env: AppEnv,
  input: Parameters<PrepareImageSources>[0],
  job: SourceJob,
) {
  const repository = input.repositories[job.sourceIndex]
  if (!repository) throw new ImageSourceStepError('repository_values')
  const locations =
    input.repositoryLocations ?? legacyRepositoryLocations(input.repositories)
  await setSourcePhase(
    env.DB,
    job.buildId,
    'finalize-starting',
    null,
    job.sourceIndex,
  )
  try {
    const started = await input.commands.start(
      finalizeSourceCommand({
        buildId: job.buildId,
        index: job.sourceIndex,
        repository,
        directory: repositoryLocation(locations, repository.id),
      }),
    )
    await setSourcePhase(
      env.DB,
      job.buildId,
      'finalize',
      started.processId,
      job.sourceIndex,
    )
  } catch (error) {
    if (!refusedSourceStart(error))
      throw sourceCommandFailure(error, 'interrupted')
    await setSourcePhase(
      env.DB,
      job.buildId,
      'finalize-ready',
      null,
      job.sourceIndex,
    )
    throw error
  }
}

/** Both Git phases reserve the same estimate. Oversized work has exclusive use. */
export async function scheduleSources(
  env: AppEnv & { GITHUB_APP_PRIVATE_KEY?: string },
  dependencies: Pick<AppDependencies, 'fetch' | 'now'>,
  input: Parameters<PrepareImageSources>[0],
  run: SourceRun,
): Promise<boolean> {
  const jobs = await buildSourceJobs(env.DB, run.buildId)
  throwSourceErrors(
    await Promise.allSettled(
      jobs.map((job) => pollSource(env, dependencies, input, job)),
    ),
  )
  const current = await buildSourceJobs(env.DB, run.buildId)
  if (current.every((job) => job.phase === 'done')) {
    await completeRunPhase(env.DB, run.buildId, 'done')
    return true
  }
  let phase = run.phase
  if (
    phase === 'copy' &&
    current.every(
      (job) => job.phase === 'finalize-ready' || job.phase === 'done',
    )
  ) {
    if (current.some((job) => job.tokenCiphertext || job.grantHash))
      throw new Error('Source access remains active')
    await completeRunPhase(env.DB, run.buildId, 'finalize')
    phase = 'finalize'
  }
  if (
    phase === 'finalize' &&
    current.some((job) => job.tokenCiphertext || job.grantHash)
  )
    throw new Error('Source access remains active')
  const running = current.filter(
    (job) => job.phase === 'fetch' || job.phase === 'finalize',
  )
  let reserved = running.reduce((sum, job) => sum + job.estimateBytes, 0)
  let active = running.length
  if (run.memoryBudget === null) throw new Error('Missing source memory budget')
  const pending: SourceJob[] = []
  for (const job of current) {
    if (job.phase !== (phase === 'copy' ? 'ready' : 'finalize-ready')) continue
    if (
      active >= 8 ||
      (active > 0 && reserved + job.estimateBytes > run.memoryBudget)
    )
      continue
    pending.push(job)
    active++
    reserved += job.estimateBytes
  }
  throwSourceErrors(
    await Promise.allSettled(
      pending.map((job) =>
        phase === 'copy'
          ? startSourceCopy(env, dependencies, input, job)
          : startFinalize(env, input, job),
      ),
    ),
  )
  return false
}
