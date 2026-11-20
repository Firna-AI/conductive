import type { HeldOutput } from '../../src/shared/output-sanitizer'
import type { AppEnv } from '../env'
import { base64Url } from '../security/crypto'

export async function answerOutputStream(
  env: AppEnv,
  workspaceId: string,
  event: Pick<HeldOutput['event'], 'sessionId' | 'turnId' | 'messageId'>,
): Promise<string> {
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
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(
      JSON.stringify([
        'answer-output-record-id-v1',
        workspaceId,
        event.sessionId,
        event.turnId,
        event.messageId,
      ]),
    ),
  )
  return `answer-${base64Url(new Uint8Array(signature))}`
}
