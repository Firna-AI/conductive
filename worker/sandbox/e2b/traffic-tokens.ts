import { decrypt, encrypt } from '../../security/crypto'
import { ProviderError } from '../errors'
import type { E2bContext } from './context'
import { completeCreateStatement } from './create-data'
import { invalidResponse } from './errors'
import { secretToken } from './identity'
import { readTrafficCiphertext, trafficStatement } from './traffic-data'

function tokenContext(account: string, sandboxId: string): string {
  return JSON.stringify(['e2b-traffic-token', account, sandboxId])
}

export async function saveTrafficToken(
  context: E2bContext,
  sandboxId: string,
  token: string,
  createKey?: string,
): Promise<void> {
  let ciphertext: string
  try {
    ciphertext = await encrypt(
      secretToken(token),
      tokenContext(context.accountId, sandboxId),
      context.encryptionKey,
    )
  } catch {
    throw new ProviderError('unavailable', 503)
  }
  const statements = [
    trafficStatement(
      context.db,
      context.accountId,
      sandboxId,
      ciphertext,
      createKey,
    ),
  ]
  if (createKey !== undefined)
    statements.push(
      completeCreateStatement(
        context.db,
        context.accountId,
        createKey,
        sandboxId,
      ),
    )
  const result = await context.db.batch(statements)
  if (result[0].meta.changes === 0) throw new ProviderError('not_found', 404)
}

export async function trafficToken(
  context: E2bContext,
  sandboxId: string,
): Promise<string | null> {
  const ciphertext = await readTrafficCiphertext(
    context.db,
    context.accountId,
    sandboxId,
  )
  if (!ciphertext) return null
  try {
    return secretToken(
      await decrypt(
        ciphertext,
        tokenContext(context.accountId, sandboxId),
        context.encryptionKey,
      ),
    )
  } catch {
    return invalidResponse()
  }
}
