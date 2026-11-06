import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
import { ProviderError } from '../sandbox/errors'
import {
  acquireCleanupLease,
  releaseCleanupLease,
  renewCleanupLease,
} from './deletion-data'

export async function withCleanupLease<T>(
  env: AppEnv,
  orgId: string,
  dependencies: AppDependencies,
  action: (token: string, suspended: boolean) => Promise<T>,
) {
  const token = dependencies.randomToken()
  const lease = await acquireCleanupLease(
    env.DB,
    orgId,
    token,
    dependencies.now(),
  )
  if (!lease) throw cleanupBusy()
  try {
    return await action(token, lease.suspendedAt !== null)
  } catch (error) {
    if (error instanceof HttpError) throw error
    if (
      error instanceof ProviderError &&
      (error.kind === 'unauthorized' || error.kind === 'forbidden')
    ) {
      throw new HttpError(
        409,
        'boat_key_required',
        'Replace the cloud computer key to continue.',
      )
    }
    throw new HttpError(
      502,
      'org_cleanup_failed',
      'The org cleanup could not finish. Try again.',
    )
  } finally {
    await releaseCleanupLease(env.DB, orgId, token)
  }
}

export async function keepCleanupLease(
  env: AppEnv,
  orgId: string,
  token: string,
  dependencies: AppDependencies,
) {
  if (!(await renewCleanupLease(env.DB, orgId, token, dependencies.now())))
    throw cleanupBusy()
}

export function cleanupBusy() {
  return new HttpError(
    409,
    'org_cleanup_busy',
    'The org is changing. Try again.',
  )
}
