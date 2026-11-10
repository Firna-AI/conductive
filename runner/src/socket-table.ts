import { TERMINAL_PORT } from '../../src/shared/terminal'

// The terminal, ascii-agent, and Sunshine belong to the sandbox image.
const internalPorts = new Set([TERMINAL_PORT, 8911, 47984, 47989, 47990, 48010])

export interface ListeningSocket {
  identity: string
  inode: string
  port: number
}

function previewAddress(address: string, ipv6: boolean): boolean {
  const width = ipv6 ? 32 : 8
  if (address.length !== width || !/^[a-f\d]+$/iu.test(address)) return false
  const bytes: number[] = []
  for (let offset = 0; offset < width; offset += 8)
    for (let byte = 6; byte >= 0; byte -= 2)
      bytes.push(
        Number.parseInt(address.slice(offset + byte, offset + byte + 2), 16),
      )
  if (bytes.every((byte) => byte === 0)) return true
  if (!ipv6) return bytes[0] === 127
  if (bytes.slice(0, 15).every((byte) => byte === 0) && bytes[15] === 1)
    return true
  return (
    bytes.slice(0, 10).every((byte) => byte === 0) &&
    bytes[10] === 255 &&
    bytes[11] === 255 &&
    (bytes[12] === 127 || bytes.slice(12).every((byte) => byte === 0))
  )
}

/** Decode the sandbox's little-endian 32-bit address words in both tables. */
export function listeningSockets(
  value: unknown,
  ipv6: boolean,
  uid: number,
): ListeningSocket[] {
  if (typeof value !== 'string')
    throw new Error('The socket table is not text.')
  const result: ListeningSocket[] = []
  for (const row of value.split('\n')) {
    const fields = row.trim().split(/\s+/u)
    const local = fields[1]?.match(/^([a-f\d]+):([a-f\d]{4})$/iu)
    const owner = fields[7]
    const inode = fields[9]
    if (
      !local ||
      fields[3]?.toUpperCase() !== '0A' ||
      !owner ||
      !/^\d+$/u.test(owner) ||
      Number(owner) !== uid ||
      !inode ||
      !/^[1-9]\d*$/u.test(inode) ||
      !previewAddress(local[1], ipv6)
    )
      continue
    const port = Number.parseInt(local[2], 16)
    if (port === 0 || internalPorts.has(port)) continue
    result.push({
      port,
      inode,
      identity: `${ipv6}:${local[1].toUpperCase()}:${port}:${inode}`,
    })
  }
  return result
}
