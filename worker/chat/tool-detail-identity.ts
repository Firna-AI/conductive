import type { AppEnv } from '../env'
import { base64Url } from '../security/crypto'

export interface ToolCandidate {
  value: string
  identity: string
}

export const TOOL_MARKER: ToolCandidate = {
  value: '[redacted]',
  identity: 'marker',
}

/** Commitments need the app key even when the encrypted salt is known. */
export async function toolCandidates(
  env: AppEnv,
  workspaceId: string,
  streamId: string,
  salt: string,
  values: readonly string[],
): Promise<ToolCandidate[]> {
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
  const result: ToolCandidate[] = []
  for (const value of values.filter(Boolean)) {
    const input = JSON.stringify([
      'tool-detail-held-identity-v1',
      workspaceId,
      streamId,
      salt,
      value,
    ])
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(input),
    )
    result.push({ value, identity: base64Url(new Uint8Array(signature)) })
  }
  return result.sort((a, b) => b.value.length - a.value.length)
}
