import { readBoatKey } from '../data/boat-keys'
import type { AppEnv, HttpFetch } from '../env'
import { HttpError } from '../http'
import { BoatClient } from '../sandbox/boat'
import { decrypt } from '../security/crypto'
import { authorizedCleanup } from './deletion-data'

/** Only deletion workers use this boundary. Active-org sandbox calls use sandbox/keys. */
export async function deletedOrgProvider(
  env: AppEnv,
  orgId: string,
  leaseToken: string,
  fetch: HttpFetch,
) {
  const authorized = await authorizedCleanup(env.DB, orgId, leaseToken)
  if (!authorized)
    throw new HttpError(404, 'org_not_found', 'The org is not available.')
  const stored = await readBoatKey(env.DB, orgId)
  if (!stored)
    throw new HttpError(
      409,
      'boat_key_required',
      'The cloud computer key is missing. Ask an org admin to add it.',
    )
  const account = { id: stored.accountId, type: stored.accountType }
  const key = await decrypt(
    stored.ciphertext,
    JSON.stringify(['boat-key', orgId, account.type, account.id]),
    env.BOAT_KEY_ENCRYPTION_KEY,
  )
  return new BoatClient(key, fetch, account)
}
