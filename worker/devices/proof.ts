import { deviceObject } from '../../src/shared/device-read'
import { base64Url, hash } from '../security/crypto'

const DOMAIN = 'conductive:device-operation:v1'
const encoder = new TextEncoder()
function decode(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(
    atob(value.replaceAll('-', '+').replaceAll('_', '/')),
    (letter) => letter.charCodeAt(0),
  )
}
function key(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    decode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

/** This signature domain cannot be used as a browser session or sign-in proof. */
export async function createDeviceProof(
  target: string,
  text: string,
  secret: string,
  now = Date.now(),
): Promise<string> {
  const payload = base64Url(
    encoder.encode(
      JSON.stringify({
        target,
        bodyHash: await hash(text),
        expiresAt: now + 30_000,
      }),
    ),
  )
  const signature = await crypto.subtle.sign(
    'HMAC',
    await key(secret),
    encoder.encode(`${DOMAIN}.${payload}`),
  )
  return `${payload}.${base64Url(new Uint8Array(signature))}`
}

export async function verifyDeviceProof(
  proof: string,
  target: string,
  text: string,
  secret: string,
): Promise<boolean> {
  try {
    const [payload, signature, extra] = proof.split('.')
    if (!payload || !signature || extra !== undefined) return false
    if (
      !(await crypto.subtle.verify(
        'HMAC',
        await key(secret),
        decode(signature),
        encoder.encode(`${DOMAIN}.${payload}`),
      ))
    )
      return false
    const value = deviceObject(
      JSON.parse(new TextDecoder().decode(decode(payload))),
    )
    return (
      value.target === target &&
      value.bodyHash === (await hash(text)) &&
      typeof value.expiresAt === 'number' &&
      Number.isFinite(value.expiresAt) &&
      value.expiresAt > Date.now()
    )
  } catch {
    return false
  }
}
