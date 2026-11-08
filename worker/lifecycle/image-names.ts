const BASE32 = 'abcdefghijklmnopqrstuvwxyz234567'
const BASE64_URL = /^[A-Za-z0-9_-]+$/
/** The sandbox provider accepts only these saved image names. */
export const SAVED_IMAGE_NAME = /^[a-z0-9][a-z0-9-]{0,62}$/

function base32(bytes: Uint8Array): string {
  let bits = 0
  let value = 0
  let output = ''
  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += BASE32[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) output += BASE32[(value << (5 - bits)) & 31]
  return output
}

/** The bytes of a random base64url ID, or null for any other text. */
function idBytes(id: string): Uint8Array | null {
  if (!BASE64_URL.test(id) || id.length % 4 === 1) return null
  const bytes = Uint8Array.from(
    atob(id.replaceAll('-', '+').replaceAll('_', '/')),
    (character) => character.charCodeAt(0),
  )
  const again = btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
  return again === id ? bytes : null
}

/**
 * The saved image name of a build. The provider accepts only lowercase
 * letters, digits, and dashes, so the name encodes the bytes of the build ID.
 */
export function savedImageName(buildId: string): string {
  const bytes = idBytes(buildId) ?? new TextEncoder().encode(buildId)
  const name = `image-${base32(bytes)}`
  if (!SAVED_IMAGE_NAME.test(name))
    throw new Error('The build ID is too long for a saved image name')
  return name
}
