import type { OwnComputerCodeResponse } from '../../src/shared/own-computers'
import type { AppEnv } from '../env'
import { decrypt, encrypt, hash } from '../security/crypto'
import type { StoredComputerCode } from './code-data'
import type { ComputerOwner } from './identity'

const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

function makeCode(): string {
  let bits = 0n
  for (const byte of crypto.getRandomValues(new Uint8Array(10)))
    bits = (bits << 8n) | BigInt(byte)
  const digits = Array.from(
    { length: 16 },
    (_, index) => alphabet[Number((bits >> BigInt(75 - 5 * index)) & 31n)],
  ).join('')
  return [
    digits.slice(0, 4),
    digits.slice(4, 8),
    digits.slice(8, 12),
    digits.slice(12),
  ].join('-')
}

function codeContext({ orgId, computerId }: ComputerOwner): string {
  return JSON.stringify(['own-computer-code', orgId, computerId])
}

export async function makeComputerCode(
  env: AppEnv,
  owner: ComputerOwner,
  now: number,
) {
  const code = makeCode()
  const expiresAt = now + 60 * 60_000
  const [digest, ciphertext] = await Promise.all([
    hash(code),
    encrypt(code, codeContext(owner), env.BOAT_KEY_ENCRYPTION_KEY),
  ])
  return {
    reply: { code, expiresAt } satisfies OwnComputerCodeResponse,
    stored: { digest, ciphertext, expiresAt } satisfies StoredComputerCode,
  }
}

export async function showComputerCode(
  env: AppEnv,
  owner: ComputerOwner,
  {
    ciphertext,
    expiresAt,
  }: Pick<StoredComputerCode, 'ciphertext' | 'expiresAt'>,
): Promise<OwnComputerCodeResponse> {
  return {
    code: await decrypt(
      ciphertext,
      codeContext(owner),
      env.BOAT_KEY_ENCRYPTION_KEY,
    ),
    expiresAt,
  }
}
