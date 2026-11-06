import { isRecord } from '../http'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

function decode(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(
    atob(value.replaceAll('-', '+').replaceAll('_', '/')),
    (character) => character.charCodeAt(0),
  )
}

export function randomToken(): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(32)))
}

export async function hash(value: string): Promise<string> {
  return base64Url(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', encoder.encode(value)),
    ),
  )
}

async function signingKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    decode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

export async function sign(
  payload: Record<string, unknown>,
  purpose: 'session' | 'github-state' | 'desktop-handoff',
  secret: string,
): Promise<string> {
  const body = base64Url(
    encoder.encode(JSON.stringify({ ...payload, purpose })),
  )
  const signature = await crypto.subtle.sign(
    'HMAC',
    await signingKey(secret),
    encoder.encode(body),
  )
  return `${body}.${base64Url(new Uint8Array(signature))}`
}

export async function verify(
  token: string,
  purpose: 'session' | 'github-state' | 'desktop-handoff',
  secret: string,
  now: number,
): Promise<Record<string, unknown> | null> {
  const key = await signingKey(secret)
  try {
    const [body, signature, extra] = token.split('.')
    if (!body || !signature || extra !== undefined) return null
    if (
      !(await crypto.subtle.verify(
        'HMAC',
        key,
        decode(signature),
        encoder.encode(body),
      ))
    ) {
      return null
    }
    const value: unknown = JSON.parse(decoder.decode(decode(body)))
    if (
      !isRecord(value) ||
      value.purpose !== purpose ||
      typeof value.expiresAt !== 'number' ||
      value.expiresAt <= now
    ) {
      return null
    }
    return value
  } catch {
    return null
  }
}

async function encryptionKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', decode(secret), 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ])
}

export async function encrypt(
  plaintext: string,
  context: string,
  secret: string,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: encoder.encode(context) },
    await encryptionKey(secret),
    encoder.encode(plaintext),
  )
  return `v1.${base64Url(iv)}.${base64Url(new Uint8Array(ciphertext))}`
}

export async function decrypt(
  envelope: string,
  context: string,
  secret: string,
): Promise<string> {
  const [version, iv, ciphertext, extra] = envelope.split('.')
  if (version !== 'v1' || !iv || !ciphertext || extra !== undefined) {
    throw new Error('Invalid encrypted secret')
  }
  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: decode(iv),
      additionalData: encoder.encode(context),
    },
    await encryptionKey(secret),
    decode(ciphertext),
  )
  return decoder.decode(plaintext)
}
