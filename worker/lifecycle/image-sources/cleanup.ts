import { captureUnexpectedWorkerFailure } from '../../error-reporting/policy'
import type { AppEnv, HttpFetch } from '../../env'
import { decrypt } from '../../security/crypto'
import type { LifecycleOwnership } from '../../members/lifecycle-contract'
import {
  clearSourceToken,
  deleteSourceJob,
  invalidateSourceGrant,
} from './cleanup-data'
import {
  orgSourceJobs,
  readSourceJob,
  sourceTokenContext,
  type SourceJob,
} from './source-data'
import { revokeInstallationToken } from './github-app'

/** A failed revoke retains encrypted ownership. No caller may release the barrier. */
export async function revokeSourceToken(
  env: AppEnv,
  fetch: HttpFetch,
  job: SourceJob,
  ownership?: LifecycleOwnership,
): Promise<boolean> {
  if (!job.tokenCiphertext) return true
  try {
    const token = await decrypt(
      job.tokenCiphertext,
      sourceTokenContext(job),
      env.BOAT_KEY_ENCRYPTION_KEY,
    )
    await revokeInstallationToken(fetch, token)
    await ownership?.renew()
    await clearSourceToken(env.DB, job.buildId, job.tokenCiphertext, ownership)
    return true
  } catch (error) {
    captureUnexpectedWorkerFailure('image_source_cleanup_failed', error)
    return false
  }
}

export async function cleanupBuildImageSources(
  env: AppEnv,
  fetch: HttpFetch,
  buildId: string,
  ownership?: LifecycleOwnership,
): Promise<boolean> {
  const job = await readSourceJob(env.DB, buildId)
  if (!job) return true
  await ownership?.renew()
  await invalidateSourceGrant(env.DB, buildId, ownership)
  if (!(await revokeSourceToken(env, fetch, job, ownership))) return false
  await ownership?.renew()
  await deleteSourceJob(env.DB, buildId, ownership)
  return true
}

/** Org suspension and purge call this before deleting image coordinator state. */
export async function cleanupOrgImageSources(
  env: AppEnv,
  fetch: HttpFetch,
  orgId: string,
  ownership?: LifecycleOwnership,
): Promise<boolean> {
  let complete = true
  for (const job of await orgSourceJobs(env.DB, orgId)) {
    if (!(await cleanupBuildImageSources(env, fetch, job.buildId, ownership)))
      complete = false
  }
  return complete
}
