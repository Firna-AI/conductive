import { ImportStorageError } from '../../src/shared/conductor-import-storage'
import type { AppEnv } from '../env'

const encoder = new TextEncoder()
const utf8 = (value: string) => new Uint8Array(encoder.encode(value))
const hex = (bytes: ArrayBuffer) =>
  Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
const encode = (value: string) =>
  encodeURIComponent(value).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  )

export async function sha256(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', bytes))
}

async function hmac(key: Uint8Array<ArrayBuffer>, value: string) {
  const signingKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return new Uint8Array(
    await crypto.subtle.sign('HMAC', signingKey, encoder.encode(value)),
  )
}

/** R2's S3 endpoint uses the auto region. No signing key leaves this module. */
export async function signR2Upload(
  env: AppEnv,
  key: string,
  sizeBytes: number,
  payloadHash: string,
  now: number,
) {
  if (
    !env.CHAT_ATTACHMENTS_S3_BUCKET_URL ||
    !URL.canParse(env.CHAT_ATTACHMENTS_S3_BUCKET_URL) ||
    !env.CHAT_ATTACHMENTS_ACCESS_KEY_ID ||
    !env.CHAT_ATTACHMENTS_SECRET_ACCESS_KEY
  )
    throw new ImportStorageError('not_configured')
  const url = new URL(env.CHAT_ATTACHMENTS_S3_BUCKET_URL)
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !/^\/[a-zA-Z0-9._-]+\/?$/.test(url.pathname)
  )
    throw new ImportStorageError('not_configured')
  url.pathname = `${url.pathname.replace(/\/$/, '')}/${key.split('/').map(encode).join('/')}`
  const date = new Date(now).toISOString().replace(/[:-]|\.\d{3}/g, '')
  const day = date.slice(0, 8)
  const scope = `${day}/auto/s3/aws4_request`
  const headers = {
    'content-length': String(sizeBytes),
    'if-none-match': '*',
    'x-amz-content-sha256': payloadHash,
  }
  const signedHeaders = 'content-length;host;if-none-match;x-amz-content-sha256'
  const parameters = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${env.CHAT_ATTACHMENTS_ACCESS_KEY_ID}/${scope}`,
    'X-Amz-Date': date,
    'X-Amz-Expires': '300',
    'X-Amz-SignedHeaders': signedHeaders,
  }
  const query = Object.entries(parameters)
    .map(([name, value]) => `${encode(name)}=${encode(value)}`)
    .sort()
    .join('&')
  const canonical = [
    'PUT',
    url.pathname,
    query,
    `content-length:${sizeBytes}\nhost:${url.host}\nif-none-match:*\nx-amz-content-sha256:${payloadHash}\n`,
    signedHeaders,
    payloadHash,
  ].join('\n')
  let signingKey = await hmac(
    utf8(`AWS4${env.CHAT_ATTACHMENTS_SECRET_ACCESS_KEY}`),
    day,
  )
  for (const value of ['auto', 's3', 'aws4_request'])
    signingKey = await hmac(signingKey, value)
  const signature = hex(
    (
      await hmac(
        signingKey,
        `AWS4-HMAC-SHA256\n${date}\n${scope}\n${await sha256(utf8(canonical))}`,
      )
    ).buffer,
  )
  url.search = `${query}&X-Amz-Signature=${signature}`
  return {
    url: url.href,
    headers,
    expiresAt: Math.floor(now / 1000) * 1000 + 300_000,
  }
}
