/**
 * Decode valid UTF-8 without removing a leading byte order mark. With
 * `partial`, more bytes follow, so a character that the end of the bytes
 * cuts in two still counts as valid, and the decode leaves it out.
 */
export function decodeUtf8(bytes: Uint8Array, partial = false): string | null {
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(
      bytes,
      { stream: partial },
    )
  } catch {
    return null
  }
}
