import type { AppDependencies, AppEnv } from '../../env'
import { HttpError } from '../../http'
import { encrypt, hash, randomToken } from '../../security/crypto'
import type { PrepareImageSources } from '../image-builds'
import { writeBuildLog } from '../build-data'
import { transientProviderError } from '../provider-retry'
import {
  legacyRepositoryLocations,
  repositoryLocation,
} from '../repository-locations'
import { authorizeImageBuilder, readSourceRepository } from './data'
import { installationToken, revokeInstallationToken } from './github-app'
import { sourceLayoutCommand } from './layout-command'
import {
  fetchSourceCommand,
  finalizeSourceCommand,
  isolatedSourceCommand,
} from './native-command'
import { cleanupBuildImageSources, revokeSourceToken } from './cleanup'
import {
  insertSourceJob,
  completeSourcePhase,
  nextSource,
  readSourceJob,
  saveSourceStatus,
  setSourcePhase,
  sourceTokenContext,
  storeSourceGrant,
} from './source-data'
import { invalidateSourceGrant } from './cleanup-data'

export function imageSourceFailure(missingKey = false): HttpError {
  return new HttpError(
    missingKey ? 503 : 502,
    'image_sources_unavailable',
    missingKey
      ? 'The repositories could not load. Ask the app operator to set the GitHub App private key.'
      : 'The repositories could not load. Check the GitHub App access and try again.',
  )
}

/** Each call starts or polls one native command. Token ownership survives actor restarts. */
export function createGitHubImageSourceMaterializer(
  env: AppEnv & { GITHUB_APP_PRIVATE_KEY?: string },
  dependencies: Pick<AppDependencies, 'fetch'> &
    Partial<Pick<AppDependencies, 'now'>>,
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
      )
      if (JSON.stringify(repositories) !== JSON.stringify(input.repositories))
        throw new Error('Captured repositories changed')
      const locations =
        input.repositoryLocations ?? legacyRepositoryLocations(repositories)
      let job = await readSourceJob(env.DB, input.buildId)
      if (
        job &&
        (job.orgId !== input.orgId || job.sandboxId !== input.sandboxId)
      )
        throw new Error('Source ownership changed')
      ownsBuild = true
      if (!job) {
        if (repositories.length && !env.GITHUB_APP_PRIVATE_KEY) {
          missingKey = true
          throw new Error('Missing App private key')
        }
        if (repositories[0])
          await readSourceRepository(env.DB, input.orgId, repositories[0])
        job = await insertSourceJob(
          env.DB,
          input.orgId,
          input.buildId,
          input.sandboxId,
        )
        await writeBuildLog(
          env.DB,
          input.buildId,
          'Updating the repositories.\n',
          Date.now(),
        )
        const started = await input.commands.start(
          isolatedSourceCommand(
            sourceLayoutCommand(
              input.buildId,
              locations,
              input.previousRepositoryLocations ?? locations,
            ),
          ),
        )
        await setSourcePhase(env.DB, input.buildId, 'layout', started.processId)
        return false
      }
      if (job.phase === 'done') {
        if (job.tokenCiphertext || job.grantHash)
          throw new Error('Source access remains active')
        return true
      }
      if (job.phase === 'abort' || job.phase.endsWith('-starting'))
        throw new Error('A source command start was interrupted')
      if (job.phase === 'ready') {
        const repository = repositories[job.sourceIndex]
        if (!repository) {
          await completeSourcePhase(env.DB, input.buildId, 'done')
          return true
        }
        if (!env.GITHUB_APP_PRIVATE_KEY) {
          missingKey = true
          throw new Error('Missing App private key')
        }
        const origin = new URL(env.MACHINE_ORIGIN ?? '')
        if (
          origin.protocol !== 'https:' ||
          origin.origin !== env.MACHINE_ORIGIN
        )
          throw new Error('Missing machine origin')
        const source = await readSourceRepository(
          env.DB,
          input.orgId,
          repository,
        )
        const token = await installationToken(
          dependencies.fetch,
          env.GITHUB_CLIENT_ID,
          env.GITHUB_APP_PRIVATE_KEY,
          source,
          dependencies.now,
        )
        const grant = randomToken()
        try {
          const ciphertext = await encrypt(
            token,
            sourceTokenContext({ ...job, repositoryId: repository.id }),
            env.BOAT_KEY_ENCRYPTION_KEY,
          )
          await storeSourceGrant(
            env.DB,
            job,
            repository.id,
            await hash(grant),
            ciphertext,
          )
        } catch (error) {
          await revokeInstallationToken(dependencies.fetch, token)
          throw error
        }
        const started = await input.commands.start(
          fetchSourceCommand({
            origin: origin.origin,
            grant,
            buildId: job.buildId,
            index: job.sourceIndex,
            repository,
          }),
        )
        await setSourcePhase(env.DB, job.buildId, 'fetch', started.processId)
        return false
      }
      if (job.phase === 'revoke') {
        if (!(await revokeSourceToken(env, dependencies.fetch, job)))
          return false
        if (job.failed) throw new Error('The source command failed')
        await completeSourcePhase(env.DB, job.buildId, 'finalize-ready')
        return false
      }
      if (job.phase === 'finalize-ready') {
        if (job.tokenCiphertext || job.grantHash)
          throw new Error('Source access remains active')
        const repository = repositories[job.sourceIndex]
        if (!repository) throw new Error('Missing captured repository')
        await setSourcePhase(env.DB, job.buildId, 'finalize-starting')
        const started = await input.commands.start(
          finalizeSourceCommand({
            buildId: job.buildId,
            index: job.sourceIndex,
            repository,
            directory: repositoryLocation(locations, repository.id),
          }),
        )
        await setSourcePhase(env.DB, job.buildId, 'finalize', started.processId)
        return false
      }
      if (job.processId === null) throw new Error('Missing source process')
      const status = await input.commands.status(job.processId, job)
      await saveSourceStatus(env.DB, job.buildId, status)
      if (status.running) return false
      const succeeded =
        status.state === 'exited' &&
        status.exitCode === 0 &&
        status.timedOut !== true
      if (job.phase === 'fetch') {
        job = (await readSourceJob(env.DB, job.buildId)) ?? job
        if (!succeeded || job.grantHash)
          await invalidateSourceGrant(env.DB, job.buildId)
        if (succeeded && !job.grantHash)
          await completeSourcePhase(env.DB, job.buildId, 'revoke')
        else await setSourcePhase(env.DB, job.buildId, 'revoke')
        if (!(await revokeSourceToken(env, dependencies.fetch, job)))
          return false
        if (!succeeded || job.grantHash)
          throw new Error('The source command failed')
        await completeSourcePhase(env.DB, job.buildId, 'finalize-ready')
      } else {
        if (!succeeded) throw new Error('The source command failed')
        if (job.phase === 'layout')
          await completeSourcePhase(env.DB, job.buildId, 'ready')
        else await nextSource(env.DB, job.buildId)
      }
      return false
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
