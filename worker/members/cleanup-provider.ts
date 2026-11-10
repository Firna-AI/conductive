import type { AppEnv } from '../env'
import { HttpError } from '../http'
import { ProviderError } from '../sandbox/errors'
import { authorizedCleanup } from './deletion-data'

/** Authorize deletion work before selecting a stored resource account. */
export async function requireDeletedOrgCleanup(
  env: AppEnv,
  orgId: string,
  leaseToken: string,
): Promise<void> {
  const authorized = await authorizedCleanup(env.DB, orgId, leaseToken)
  if (!authorized)
    throw new HttpError(404, 'org_not_found', 'The org is not available.')
}

export async function ignoreAlreadyRemoved(action: () => Promise<unknown>) {
  try {
    await action()
  } catch (error) {
    if (!(error instanceof ProviderError) || error.kind !== 'not_found')
      throw error
  }
}
