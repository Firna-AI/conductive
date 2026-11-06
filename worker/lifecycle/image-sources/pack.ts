import type { HttpFetch } from '../../env'
import { gitRequest } from './git-http'
import { encodePacket, PacketReader, packetText } from './packet-reader'
import type { SourceRef } from './refs'

/** No haves, shallow boundary, or thin packs: the pack contains full default history. */
export async function transferPack(
  fetch: HttpFetch,
  url: string,
  token: string,
  ref: SourceRef,
  write: (bytes: Uint8Array) => Promise<void>,
): Promise<void> {
  if (!ref.oid) throw new Error('Missing Git object')
  const sideband = ref.capabilities.includes('side-band-64k')
    ? 'side-band-64k'
    : ref.capabilities.includes('side-band')
      ? 'side-band'
      : undefined
  const capabilities = [
    sideband,
    ...ref.capabilities.filter(
      (value) =>
        value === 'ofs-delta' ||
        value === 'no-progress' ||
        value === 'include-tag' ||
        value.startsWith('object-format='),
    ),
  ].filter((value) => value !== undefined)
  const body =
    encodePacket(
      `want ${ref.oid}${capabilities.length ? ` ${capabilities.join(' ')}` : ''}\n`,
    ) +
    '0000' +
    encodePacket('done\n')
  const response = await gitRequest(
    fetch,
    `${url}/git-upload-pack`,
    token,
    body,
  )
  if (!response.body) throw new Error('Missing Git pack')
  const reader = new PacketReader(response.body)
  const prefix = new Uint8Array(4)
  let size = 0
  const writeData = async (bytes: Uint8Array) => {
    if (size < prefix.length)
      prefix.set(bytes.subarray(0, prefix.length - size), size)
    size += bytes.length
    await write(bytes)
  }
  try {
    if (packetText(await reader.packet()) !== 'NAK')
      throw new Error('Invalid Git negotiation')
    if (sideband) {
      while (true) {
        const packet = await reader.packet()
        if (packet.kind === 'flush') break
        if (packet.kind !== 'data' || packet.data.length === 0)
          throw new Error('Incomplete Git pack')
        if (packet.data[0] === 1) await writeData(packet.data.subarray(1))
        else if (packet.data[0] !== 2)
          throw new Error('Git pack transfer failed')
      }
      if ((await reader.packet()).kind !== 'end')
        throw new Error('Invalid Git pack ending')
    } else {
      for await (const bytes of reader.remaining()) await writeData(bytes)
    }
    if (size < 32 || new TextDecoder().decode(prefix) !== 'PACK') {
      throw new Error('Invalid Git pack')
    }
  } finally {
    await reader.close()
  }
}
