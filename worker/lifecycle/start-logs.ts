import type { AppEnv } from '../env'
import { encrypt, decrypt } from '../security/crypto'
import { isRecord } from '../http'
import { redactStartupLog } from './workspace-start'

export function startLogContext(workspaceId: string, attempt: string): string {
  return JSON.stringify(['workspace-start-log', workspaceId, attempt])
}

export async function encryptedStartText(
  env: Pick<AppEnv, 'BOAT_KEY_ENCRYPTION_KEY'>,
  context: string,
  text: string,
): Promise<string> {
  return encrypt(text, context, env.BOAT_KEY_ENCRYPTION_KEY)
}

export async function releasedStartLog(
  env: Pick<AppEnv, 'BOAT_KEY_ENCRYPTION_KEY'>,
  context: string,
  chunks: readonly string[],
  secretsCiphertext: string | undefined,
): Promise<string> {
  if (!secretsCiphertext) return ''
  const value: unknown = JSON.parse(
    await decrypt(secretsCiphertext, context, env.BOAT_KEY_ENCRYPTION_KEY),
  )
  if (!isRecord(value) || !Array.isArray(value.secrets))
    throw new Error('Invalid stored start log secrets')
  const secrets = value.secrets.map((secret: unknown) => {
    if (typeof secret !== 'string') throw new Error('Invalid start log secret')
    return secret
  })
  const stdout: string[] = []
  const stderr: string[] = []
  for (const chunk of chunks) {
    const value: unknown = JSON.parse(
      await decrypt(chunk, context, env.BOAT_KEY_ENCRYPTION_KEY),
    )
    if (
      !isRecord(value) ||
      typeof value.text !== 'string' ||
      (value.stream !== 'stdout' && value.stream !== 'stderr')
    )
      throw new Error('Invalid stored log chunk')
    if (value.stream === 'stdout') stdout.push(value.text)
    else stderr.push(value.text)
  }
  return (
    redactStartupLog(stdout.join(''), secrets) +
    redactStartupLog(stderr.join(''), secrets)
  )
}
