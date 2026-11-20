import type { SecretCandidate } from '../../src/shared/secret-held'
import type { AppEnv } from '../env'
import { base64Url } from '../security/crypto'

/** Salt and identities stay encrypted; the app key also prevents offline guesses. */
export async function outputCandidates(
  env: AppEnv,
  workspaceId: string,
  salt: string,
  values: readonly string[],
): Promise<SecretCandidate[]> {
  const key = await crypto.subtle.importKey(
    'raw',
    Uint8Array.from(
      atob(
        env.BOAT_KEY_ENCRYPTION_KEY.replaceAll('-', '+').replaceAll('_', '/'),
      ),
      (point) => point.charCodeAt(0),
    ),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const result: SecretCandidate[] = []
  for (const value of values.filter(Boolean)) {
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(
        JSON.stringify([
          'answer-output-held-identity-v1',
          workspaceId,
          salt,
          value,
        ]),
      ),
    )
    result.push({ value, identity: base64Url(new Uint8Array(signature)) })
  }
  return result.sort((a, b) => b.value.length - a.value.length)
}
