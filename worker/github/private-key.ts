export async function appSigningKey(pem: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'pkcs8',
    privateKeyBytes(pem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
}

/** GitHub downloads PKCS#1 keys. Web Crypto imports the PKCS#8 envelope. */
function privateKeyBytes(pem: string): Uint8Array<ArrayBuffer> {
  const match = pem
    .trim()
    .match(
      /^-----BEGIN (RSA PRIVATE KEY|PRIVATE KEY)-----([A-Za-z0-9+/=\s]*)-----END \1-----$/u,
    )
  // Keep PKCS#8 bodies with no frame or an incomplete frame readable.
  const encoded = (
    match?.[2] ??
    pem
      .replace('-----BEGIN PRIVATE KEY-----', '')
      .replace('-----END PRIVATE KEY-----', '')
  ).replaceAll(/\s/gu, '')
  const bytes = Uint8Array.from(atob(encoded), (value) => value.charCodeAt(0))
  if (match?.[1] !== 'RSA PRIVATE KEY') return bytes
  const version = new Uint8Array([0x02, 0x01, 0x00])
  // rsaEncryption OID 1.2.840.113549.1.1.1 with NULL parameters.
  const algorithm = new Uint8Array([
    0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01,
    0x01, 0x05, 0x00,
  ])
  return der(0x30, concatenate([version, algorithm, der(0x04, bytes)]))
}

function der(tag: number, content: Uint8Array): Uint8Array<ArrayBuffer> {
  let length = content.byteLength
  const encodedLength: number[] = []
  do {
    encodedLength.unshift(length & 0xff)
    length = Math.floor(length / 256)
  } while (length > 0)
  const prefix =
    content.byteLength < 128
      ? new Uint8Array([tag, content.byteLength])
      : new Uint8Array([tag, 0x80 | encodedLength.length, ...encodedLength])
  return concatenate([prefix, content])
}

function concatenate(parts: readonly Uint8Array[]): Uint8Array<ArrayBuffer> {
  const result = new Uint8Array(
    parts.reduce((length, part) => length + part.length, 0),
  )
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}
