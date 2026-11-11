import type { AppDependencies, AppEnv } from '../../env'
import { HttpError } from '../../http'
import type { PrepareImageSources } from '../image-builds'
import { writeBuildLog } from '../build-data'
import { transientProviderError } from '../provider-retry'
import { authorizeImageBuilder } from './data'
import { cleanupBuildImageSources } from './cleanup'
import { advanceSourceLayout } from './layout'
import { advanceLegacySources } from './legacy'
import { prepareSourceMetadata } from './metadata'
import { insertSourceRun, readSourceRun } from './run-data'
import { scheduleSources } from './schedule'
import { buildSourceJobs } from './source-data'

export function imageSourceFailure(missingKey = false): HttpError {
  return new HttpError(
    missingKey ? 503 : 502,
    'image_sources_unavailable',
    missingKey
      ? 'The repositories could not load. Ask the app operator to set the GitHub App private key.'
      : 'The repositories could not load. Check the GitHub App access and try again.',
  )
}

/** Each call polls active copies and fills the saved memory budget. */
export function createGitHubImageSourceMaterializer(
  env: AppEnv & { GITHUB_APP_PRIVATE_KEY?: string },
  dependencies: Pick<AppDependencies, 'fetch' | 'now'>,
): PrepareImageSources {
  return async (input) => {
    let missingKey = false
    let ownsBuild = false
    try {
      const repositories = await authorizeImageBuilder(
        env.DB,
        input.orgId,
        input.buildId,
        input.sandboxId,
        input.providerAccount,
      )
      if (JSON.stringify(repositories) !== JSON.stringify(input.repositories))
        throw new Error('Captured repositories changed')
      let run = await readSourceRun(env.DB, input.buildId)
      const jobs = await buildSourceJobs(env.DB, input.buildId)
      for (const owner of [...jobs, ...(run ? [run] : [])]) {
        if (
          owner.orgId !== input.orgId ||
          owner.sandboxId !== input.sandboxId ||
          owner.providerAccount !== input.providerAccount
        )
          throw new Error('Source ownership changed')
      }
      ownsBuild = true
      if (
        repositories.length &&
        !env.GITHUB_APP_PRIVATE_KEY &&
        (!run ||
          run.phase === 'metadata-ready' ||
          (run.phase === 'copy' && jobs.some((job) => job.phase === 'ready')))
      ) {
        missingKey = true
        throw new Error('Missing App private key')
      }
      if (!run) {
        run = await insertSourceRun(
          env.DB,
          input,
          repositories,
          jobs.length > 0,
        )
        await writeBuildLog(
          env.DB,
          input.buildId,
          'Updating the repositories.\n',
          dependencies.now(),
        )
      }
      if (
        run.failed ||
        run.phase === 'abort' ||
        run.phase === 'layout-starting'
      )
        throw new Error('A source command start was interrupted')
      if (run.phase === 'legacy')
        return await advanceLegacySources(env, dependencies, input, run)
      if (run.phase === 'done') {
        if (jobs.some((job) => job.tokenCiphertext || job.grantHash))
          throw new Error('Source access remains active')
        return true
      }
      if (run.phase === 'layout-ready' || run.phase === 'layout') {
        await advanceSourceLayout(env, input, run)
        return false
      }
      if (
        run.phase === 'metadata-ready' ||
        run.phase === 'metadata-reading' ||
        run.phase === 'metadata-revoke'
      ) {
        if (
          !(await prepareSourceMetadata(env, dependencies, run, repositories))
        )
          return false
        run = (await readSourceRun(env.DB, run.buildId)) ?? run
      }
      return await scheduleSources(env, dependencies, input, run)
    } catch (error) {
      if (transientProviderError(error)) throw error
      if (
        ownsBuild &&
        !(await cleanupBuildImageSources(
          env,
          dependencies.fetch,
          input.buildId,
        ))
      )
        return false
      throw imageSourceFailure(missingKey)
    }
  }
}
