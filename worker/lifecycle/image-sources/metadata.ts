import type { AppDependencies, AppEnv } from '../../env'
import { decrypt, encrypt } from '../../security/crypto'
import type { SelectedRepository } from '../settings-data'
import { readSourceRepositories } from './data'
import {
  metadataInstallationToken,
  revokeInstallationToken,
} from './github-app'
import { revokeSourceToken } from './cleanup'
import { readSourceRun, setRunPhase, type SourceRun } from './run-data'
import {
  completeMetadataBatch,
  saveMetadataChunk,
  saveMetadataPlan,
  storeMetadataToken,
} from './metadata-data'
import { metadataPlan, readMetadataPlan } from './metadata-plan'
import { readMetadataSizes } from './metadata-read'
import { readSourceAt, sourceTokenContext } from './source-data'

const METADATA_READ_CHUNK = 32

/** Each saved batch finishes revocation before another token or any copy starts. */
export async function prepareSourceMetadata(
  env: AppEnv & { GITHUB_APP_PRIVATE_KEY?: string },
  dependencies: Pick<AppDependencies, 'fetch' | 'now'>,
  run: SourceRun,
  repositories: SelectedRepository[],
): Promise<boolean> {
  if (!repositories.length) {
    await setRunPhase(env.DB, run.buildId, 'copy')
    return true
  }
  let plan =
    run.metadataPlanJson === null
      ? null
      : readMetadataPlan(run.metadataPlanJson)
  if (!plan) {
    plan = metadataPlan(
      await readSourceRepositories(env.DB, run.orgId, repositories),
    )
    await saveMetadataPlan(env.DB, run, plan)
  }
  const batch = plan[run.metadataBatchIndex]
  if (!batch) throw new Error('Missing metadata ownership')
  let owner = await readSourceAt(env.DB, run.buildId, 0)
  if (!owner) throw new Error('Missing metadata ownership')
  if (run.phase === 'metadata-ready') {
    if (!env.GITHUB_APP_PRIVATE_KEY) throw new Error('Missing App private key')
    const token = await metadataInstallationToken(
      dependencies.fetch,
      env.GITHUB_CLIENT_ID,
      env.GITHUB_APP_PRIVATE_KEY,
      batch,
      dependencies.now,
    )
    try {
      await storeMetadataToken(
        env.DB,
        owner,
        await encrypt(
          token,
          sourceTokenContext(owner),
          env.BOAT_KEY_ENCRYPTION_KEY,
        ),
        run,
      )
    } catch (error) {
      await revokeInstallationToken(dependencies.fetch, token)
      throw error
    }
    run = (await readSourceRun(env.DB, run.buildId)) ?? run
    owner = (await readSourceAt(env.DB, run.buildId, 0)) ?? owner
  }
  if (run.phase === 'metadata-reading') {
    if (!owner.tokenCiphertext) throw new Error('Missing metadata ownership')
    const token = await decrypt(
      owner.tokenCiphertext,
      sourceTokenContext(owner),
      env.BOAT_KEY_ENCRYPTION_KEY,
    )
    const remaining = batch.repositories.slice(
      run.metadataRepositoryIndex,
      run.metadataRepositoryIndex + METADATA_READ_CHUNK,
    )
    const estimates = await readMetadataSizes(
      dependencies.fetch,
      token,
      remaining,
    )
    await saveMetadataChunk(env.DB, run, estimates, batch.repositories.length)
    if (
      run.metadataRepositoryIndex + estimates.length <
      batch.repositories.length
    )
      return false
    run = { ...run, phase: 'metadata-revoke' }
  }
  if (!(await revokeSourceToken(env, dependencies.fetch, owner))) return false
  await completeMetadataBatch(env.DB, run, plan.length)
  return run.metadataBatchIndex + 1 === plan.length
}
