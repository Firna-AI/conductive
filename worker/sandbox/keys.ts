import type { BoatKeyStatus } from '../../src/shared/api'
import { boatKeyStatus, readBoatKey, saveBoatKey } from '../data/boat-keys'
import { findMembership } from '../data/orgs'
import type { AppEnv, HttpFetch } from '../env'
import { HttpError } from '../http'
import { assertCanMaintainOrgKey } from '../members/key-maintenance'
import { decrypt, encrypt } from '../security/crypto'
import { BoatClient } from './boat'
import { ProviderError } from './errors'
import type { BoatAccount, SandboxProvider } from './provider'

function keyContext(orgId: string, account: BoatAccount): string {
  return JSON.stringify(['boat-key', orgId, account.type, account.id])
}

export async function storeBoatKey(
  env: AppEnv,
  orgId: string,
  userId: string,
  key: string,
  fetch: HttpFetch,
  now: number,
): Promise<BoatKeyStatus> {
  await assertCanMaintainOrgKey(env.DB, orgId, userId)
  const stored = await readBoatKey(env.DB, orgId)
  const expected: BoatAccount | undefined = stored
    ? { id: stored.accountId, type: stored.accountType }
    : undefined
  let account: BoatAccount
  try {
    // One read-only test call. Discovery works without account administration.
    account = await BoatClient.inspectAccount(key, fetch, expected)
  } catch (error) {
    if (
      error instanceof ProviderError &&
      (error.kind === 'unauthorized' || error.kind === 'forbidden')
    ) {
      throw new HttpError(
        400,
        'boat_key_refused',
        'Boat refused this key. Check its expiry and permissions.',
      )
    }
    throw new HttpError(
      502,
      'boat_unavailable',
      'Boat could not check the key. Try again.',
    )
  }
  const ciphertext = await encrypt(
    key,
    keyContext(orgId, account),
    env.BOAT_KEY_ENCRYPTION_KEY,
  )
  if (!(await saveBoatKey(env.DB, orgId, userId, account, ciphertext, now))) {
    await assertCanMaintainOrgKey(env.DB, orgId, userId)
    throw new HttpError(
      409,
      'boat_account_mismatch',
      'This key uses another Boat account. Use a key for the current account, or create a new org.',
    )
  }
  return boatKeyStatus(env.DB, orgId)
}

/** Internal server loader. Callers must authorize the org and its resource first. No plaintext credential leaves it. */
export async function storedOrgSandboxProvider(
  env: AppEnv,
  orgId: string,
  fetch: HttpFetch,
  missingKeyMessage: string,
): Promise<SandboxProvider> {
  const stored = await readBoatKey(env.DB, orgId)
  if (!stored) throw new HttpError(409, 'boat_key_required', missingKeyMessage)
  const account: BoatAccount = {
    id: stored.accountId,
    type: stored.accountType,
  }
  const key = await decrypt(
    stored.ciphertext,
    keyContext(orgId, account),
    env.BOAT_KEY_ENCRYPTION_KEY,
  )
  return new BoatClient(key, fetch, account)
}

/** The key stays inside the adapter. Callers receive no plaintext credential. */
export async function orgSandboxProvider(
  env: AppEnv,
  userId: string,
  orgId: string,
  fetch: HttpFetch,
): Promise<SandboxProvider> {
  if (!(await findMembership(env.DB, orgId, userId))) {
    throw new HttpError(404, 'org_not_found', 'The org is not available.')
  }
  return storedOrgSandboxProvider(
    env,
    orgId,
    fetch,
    'Add the org’s Boat key to continue.',
  )
}
