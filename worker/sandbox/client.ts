import { findMembership } from '../data/orgs'
import type { AppEnv, HttpFetch } from '../env'
import { HttpError } from '../http'
import { BoatClient } from './boat'
import type { SandboxProvider } from './provider'

/** Trusted callers authorize the org and its resource before requesting a provider. */
export function sandboxProvider(
  env: AppEnv,
  fetch: HttpFetch,
): SandboxProvider {
  return new BoatClient(env.BOAT_API_KEY, fetch, env.BOAT_ORG_ID)
}

export async function orgSandboxProvider(
  env: AppEnv,
  userId: string,
  orgId: string,
  fetch: HttpFetch,
): Promise<SandboxProvider> {
  if (!(await findMembership(env.DB, orgId, userId))) {
    throw new HttpError(404, 'org_not_found', 'The org is not available.')
  }
  return sandboxProvider(env, fetch)
}
