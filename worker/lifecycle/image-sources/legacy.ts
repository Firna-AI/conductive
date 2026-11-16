import type { AppDependencies, AppEnv } from '../../env'
import type { PrepareImageSources } from '../image-builds'
import { revokeSourceToken } from './cleanup'
import { finishSourceCopy } from './copy-data'
import { upgradeLegacySources } from './legacy-data'
import type { SourceRun } from './run-data'
import { sourceCommandSucceeded } from './schedule'
import { readSourceJob, saveSourceStatus, setSourcePhase } from './source-data'

export async function advanceLegacySources(
  env: AppEnv,
  dependencies: Pick<AppDependencies, 'fetch' | 'now'>,
  input: Parameters<PrepareImageSources>[0],
  run: SourceRun,
): Promise<boolean> {
  const job = await readSourceJob(env.DB, run.buildId)
  if (!job) throw new Error('Missing legacy source ownership')
  if (job.failed || job.phase === 'abort' || job.phase.endsWith('-starting'))
    throw new Error('The source command failed')
  if (
    job.phase === 'layout' ||
    job.phase === 'fetch' ||
    job.phase === 'finalize'
  ) {
    if (job.processId === null) throw new Error('Missing source process')
    const status = await input.commands.status(job.processId, job)
    await saveSourceStatus(env.DB, job.buildId, status, job.sourceIndex)
    if (status.running) return false
    if (job.phase === 'fetch') {
      const current = await readSourceJob(env.DB, job.buildId)
      if (!current) throw new Error('Missing legacy source ownership')
      const succeeded = sourceCommandSucceeded(status) && !current.grantHash
      await finishSourceCopy(env.DB, current, succeeded, dependencies.now())
      const revoked = await revokeSourceToken(env, dependencies.fetch, current)
      if (!succeeded) throw new Error('The source command failed')
      if (revoked)
        await setSourcePhase(
          env.DB,
          job.buildId,
          'finalize-ready',
          null,
          job.sourceIndex,
        )
      return false
    }
    if (!sourceCommandSucceeded(status))
      throw new Error('The source command failed')
    if (job.phase === 'layout') {
      await setSourcePhase(env.DB, job.buildId, 'ready', null, job.sourceIndex)
      return false
    }
    await upgradeLegacySources(
      env.DB,
      run,
      input.repositories,
      job.sourceIndex + 1,
    )
    return false
  }
  if (job.phase === 'revoke') {
    if (!(await revokeSourceToken(env, dependencies.fetch, job))) return false
    await setSourcePhase(
      env.DB,
      job.buildId,
      'finalize-ready',
      null,
      job.sourceIndex,
    )
    return false
  }
  if (job.tokenCiphertext || job.grantHash)
    throw new Error('Source access remains active')
  await upgradeLegacySources(
    env.DB,
    run,
    input.repositories,
    job.phase === 'done' ? input.repositories.length : job.sourceIndex,
    job.phase === 'finalize-ready' ? job.sourceIndex : null,
  )
  return job.phase === 'done'
}
