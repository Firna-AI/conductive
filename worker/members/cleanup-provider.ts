import type { AppEnv, HttpFetch } from '../env'
import { HttpError } from '../http'
import { ProviderError } from '../sandbox/errors'
import { storedOrgSandboxProvider } from '../sandbox/keys'
import type { SandboxProvider } from '../sandbox/provider'
import { authorizedCleanup } from './deletion-data'

/** Only deletion workers use this boundary. Active-org sandbox calls use sandbox/keys. */
export async function deletedOrgProvider(
  env: AppEnv,
  orgId: string,
  leaseToken: string,
  fetch: HttpFetch,
): Promise<SandboxProvider> {
  const authorized = await authorizedCleanup(env.DB, orgId, leaseToken)
  if (!authorized)
    throw new HttpError(404, 'org_not_found', 'The org is not available.')
  return storedOrgSandboxProvider(
    env,
    orgId,
    fetch,
    'Replace the cloud computer key to continue.',
  )
}

export async function ignoreAlreadyRemoved(action: () => Promise<unknown>) {
  try {
    await action()
  } catch (error) {
    if (!(error instanceof ProviderError) || error.kind !== 'not_found')
      throw error
  }
}
