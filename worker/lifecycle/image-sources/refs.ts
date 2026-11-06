import { PacketReader, packetText } from './packet-reader'

export interface SourceRef {
  oid: string | null
  objectFormat: 'sha1' | 'sha256'
  capabilities: readonly string[]
}

interface SourceRefSink {
  initialize(objectFormat: SourceRef['objectFormat']): Promise<void>
  tag(oid: string, name: Uint8Array): Promise<void>
}

export async function readDefaultRef(
  response: Response,
  branch: string,
  sink: SourceRefSink,
): Promise<SourceRef> {
  if (!response.body) throw new Error('Missing Git advertisement')
  const reader = new PacketReader(response.body)
  const wanted = new TextEncoder().encode(`refs/heads/${branch}`)
  try {
    if (packetText(await reader.packet()) !== '# service=git-upload-pack') {
      throw new Error('Invalid Git service')
    }
    if ((await reader.packet()).kind !== 'flush')
      throw new Error('Invalid Git service')
    let capabilities: string[] = []
    let oid: string | null = null
    let first = true
    let empty = false
    let objectFormat: SourceRef['objectFormat'] = 'sha1'
    while (true) {
      const packet = await reader.packet()
      if (packet.kind === 'flush') break
      if (packet.kind !== 'data') throw new Error('Missing Git reference')
      const data =
        packet.data.at(-1) === 10 ? packet.data.subarray(0, -1) : packet.data
      if (first && bytesEqual(data, new TextEncoder().encode('version 1')))
        continue
      const nul = data.indexOf(0)
      if (first) {
        if (nul < 0 || data.indexOf(0, nul + 1) >= 0)
          throw new Error('Missing Git capabilities')
        const declared = new TextDecoder('utf-8', {
          fatal: true,
          ignoreBOM: true,
        }).decode(data.subarray(nul + 1))
        capabilities = declared.split(' ')
        const format = capabilities
          .find((value) => value.startsWith('object-format='))
          ?.slice(14)
        if (format !== undefined && format !== 'sha1' && format !== 'sha256') {
          throw new Error('Invalid Git object format')
        }
        objectFormat = format ?? 'sha1'
      } else if (nul >= 0) {
        throw new Error('Invalid Git capabilities')
      }
      const ref = nul >= 0 ? data.subarray(0, nul) : data
      const separator = ref.indexOf(32)
      const oidText = new TextDecoder().decode(ref.subarray(0, separator))
      const name = ref.subarray(separator + 1)
      if (
        separator < 0 ||
        !name.length ||
        !/^[0-9a-f]+$/iu.test(oidText) ||
        oidText.length !== (objectFormat === 'sha1' ? 40 : 64)
      ) {
        throw new Error('Invalid Git reference')
      }
      if (first) await sink.initialize(objectFormat)
      if (
        first &&
        /^0+$/u.test(oidText) &&
        bytesEqual(name, new TextEncoder().encode('capabilities^{}'))
      ) {
        empty = true
      } else {
        if (empty || /^0+$/u.test(oidText))
          throw new Error('Invalid Git reference')
        // Git ref names are byte strings. Other refs need not be valid UTF-8.
        if (bytesEqual(name, wanted)) oid = oidText.toLowerCase()
        if (
          bytesEqual(
            name.subarray(0, 10),
            new TextEncoder().encode('refs/tags/'),
          ) &&
          !bytesEqual(name.subarray(-3), new TextEncoder().encode('^{}'))
        ) {
          if (name.some((byte) => byte <= 32 || byte === 127)) {
            throw new Error('Invalid Git tag reference')
          }
          await sink.tag(oidText.toLowerCase(), name)
        }
      }
      first = false
    }
    if (first || (!empty && !oid) || (await reader.packet()).kind !== 'end') {
      throw new Error('Default Git branch is not available')
    }
    return { oid, objectFormat, capabilities }
  } finally {
    await reader.close()
  }
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  )
}
