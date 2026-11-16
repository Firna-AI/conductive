import type { AppDependencies, AppEnv } from '../../env'
import { encrypt, hash, randomToken } from '../../security/crypto'
import type { PrepareImageSources } from '../image-builds'
import { revokeSourceToken } from './cleanup'
import { refuseSourceCopy } from './copy-data'
import { readSourceRepository } from './data'
import { installationToken, revokeInstallationToken } from './github-app'
import { fetchSourceCommand } from './native-command'
import { refusedSourceStart } from './source-commands'
import {
  setSourcePhase,
  sourceTokenContext,
  storeSourceGrant,
  type SourceJob,
} from './source-data'

export async function startSourceCopy(
  env: AppEnv & { GITHUB_APP_PRIVATE_KEY?: string },
  dependencies: Pick<AppDependencies, 'fetch' | 'now'>,
  input: Parameters<PrepareImageSources>[0],
  job: SourceJob,
) {
  const repository = input.repositories[job.sourceIndex]
  if (!repository || !env.GITHUB_APP_PRIVATE_KEY)
    throw new Error('Missing source access')
  const origin = new URL(env.MACHINE_ORIGIN ?? '')
  if (origin.protocol !== 'https:' || origin.origin !== env.MACHINE_ORIGIN)
    throw new Error('Missing machine origin')
  const source = await readSourceRepository(env.DB, input.orgId, repository)
  const token = await installationToken(
    dependencies.fetch,
    env.GITHUB_CLIENT_ID,
    env.GITHUB_APP_PRIVATE_KEY,
    source,
    dependencies.now,
  )
  const grant = randomToken()
  let ciphertext: string
  try {
    ciphertext = await encrypt(
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
  try {
    const started = await input.commands.start(
      fetchSourceCommand({
        origin: origin.origin,
        grant,
        buildId: job.buildId,
        index: job.sourceIndex,
        repository,
      }),
    )
    await setSourcePhase(
      env.DB,
      job.buildId,
      'fetch',
      started.processId,
      job.sourceIndex,
    )
  } catch (error) {
    if (refusedSourceStart(error)) {
      await refuseSourceCopy(env.DB, job)
      if (
        await revokeSourceToken(env, dependencies.fetch, {
          ...job,
          repositoryId: repository.id,
          tokenCiphertext: ciphertext,
        })
      )
        await setSourcePhase(
          env.DB,
          job.buildId,
          'ready',
          null,
          job.sourceIndex,
        )
    }
    throw error
  }
}
