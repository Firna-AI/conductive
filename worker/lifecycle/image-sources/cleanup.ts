import type { AppEnv, HttpFetch } from '../../env'
import { decrypt } from '../../security/crypto'
import type { LifecycleOwnership } from '../../members/lifecycle-contract'
import {
  clearSourceToken,
  deleteSourceJob,
  invalidateSourceGrant,
} from './cleanup-data'
import {
  buildSourceJobs,
  sourceTokenContext,
  type SourceJob,
} from './source-data'
import { revokeInstallationToken } from './github-app'
import { readSourceRun } from './run-data'
import {
  deleteSourceRun,
  invalidateSourceRun,
  orgSourceBuildIds,
} from './run-cleanup-data'

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
  } catch {
    return false
  }
}

export async function cleanupBuildImageSources(
  env: AppEnv,
  fetch: HttpFetch,
  buildId: string,
  ownership?: LifecycleOwnership,
): Promise<boolean> {
  const jobs = await buildSourceJobs(env.DB, buildId)
  const run = await readSourceRun(env.DB, buildId)
  if (!jobs.length && !run) return true
  await ownership?.renew()
  if (jobs.length) await invalidateSourceGrant(env.DB, buildId, ownership)
  if (run) await invalidateSourceRun(env.DB, buildId, ownership)
  let complete = true
  for (const job of jobs) {
    if (!(await revokeSourceToken(env, fetch, job, ownership))) complete = false
  }
  if (!complete) return false
  await ownership?.renew()
  await deleteSourceJob(env.DB, buildId, ownership)
  await deleteSourceRun(env.DB, buildId, ownership)
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
  for (const buildId of await orgSourceBuildIds(env.DB, orgId)) {
    if (!(await cleanupBuildImageSources(env, fetch, buildId, ownership)))
      complete = false
  }
  return complete
}
