import { createHash } from 'node:crypto'
import { deflateSync } from 'node:zlib'

export const SOURCE_BRANCH = "feature/reader's-default"
export const INSTALLATION_TOKEN = 'ghs_worker_only_image_source_secret'

export interface SourceTagFixture {
  oid: string
  name: Uint8Array
  peeledOid?: string
}

/** An independent Git fixture with two commits and a blob larger than one command. */
export function sourcePack() {
  let seed = 971
  const content = Buffer.alloc(140_000)
  for (let index = 0; index < content.length; index++) {
    seed ^= seed << 13
    seed ^= seed >>> 17
    seed ^= seed << 5
    content[index] = 32 + ((seed >>> 0) % 95)
  }
  const before = object('blob', 3, Buffer.from('Before the source refresh.\n'))
  const firstTree = object(
    'tree',
    2,
    Buffer.concat([Buffer.from('100644 source.txt\0'), before.oid]),
  )
  const firstCommit = object(
    'commit',
    1,
    commit(firstTree.oid, null, 'First source commit'),
  )
  const after = object('blob', 3, content)
  const secondTree = object(
    'tree',
    2,
    Buffer.concat([Buffer.from('100644 source.txt\0'), after.oid]),
  )
  const secondCommit = object(
    'commit',
    1,
    commit(secondTree.oid, firstCommit.oid, 'Second source commit'),
  )
  const annotated = object(
    'tag',
    4,
    Buffer.from(
      [
        `object ${firstCommit.oid.toString('hex')}`,
        'type commit',
        'tag v1.0.0',
        'tagger Source Reader <source@example.test> 1800000000 +0000',
        '',
        'Release version one.',
        '',
      ].join('\n'),
    ),
  )
  const tags: SourceTagFixture[] = [
    {
      oid: annotated.oid.toString('hex'),
      name: Buffer.from('refs/tags/v1.0.0'),
      peeledOid: firstCommit.oid.toString('hex'),
    },
    {
      oid: secondCommit.oid.toString('hex'),
      name: Buffer.from('refs/tags/lightweight-current'),
    },
    { oid: 'f'.repeat(40), name: Buffer.from('refs/tags/unrelated-history') },
    {
      oid: firstCommit.oid.toString('hex'),
      name: Buffer.concat([Buffer.from('refs/tags/raw-'), Buffer.from([0xff])]),
    },
    ...Array.from({ length: 1200 }, (_, index) => ({
      oid: firstCommit.oid.toString('hex'),
      name: Buffer.from(
        `refs/tags/archive/release-${String(index).padStart(4, '0')}`,
      ),
    })),
  ]
  const data = Buffer.concat([
    Buffer.from('5041434b0000000200000007', 'hex'),
    before.packed,
    firstTree.packed,
    firstCommit.packed,
    after.packed,
    secondTree.packed,
    secondCommit.packed,
    annotated.packed,
  ])
  return {
    bytes: new Uint8Array(
      Buffer.concat([data, createHash('sha1').update(data).digest()]),
    ),
    oid: secondCommit.oid.toString('hex'),
    firstOid: firstCommit.oid.toString('hex'),
    content,
    annotatedTagOid: annotated.oid.toString('hex'),
    tags,
  }
}

function object(name: string, type: number, content: Buffer) {
  let length = content.length
  const header: number[] = [(type << 4) | (length & 15)]
  length >>>= 4
  while (length) {
    header[header.length - 1] |= 0x80
    header.push(length & 0x7f)
    length >>>= 7
  }
  return {
    oid: createHash('sha1')
      .update(Buffer.from(`${name} ${content.length}\0`))
      .update(content)
      .digest(),
    packed: Buffer.concat([Buffer.from(header), deflateSync(content)]),
  }
}

function commit(tree: Buffer, parent: Buffer | null, message: string): Buffer {
  return Buffer.from(
    [
      `tree ${tree.toString('hex')}`,
      ...(parent ? [`parent ${parent.toString('hex')}`] : []),
      'author Source Reader <source@example.test> 1800000000 +0000',
      'committer Source Reader <source@example.test> 1800000000 +0000',
      '',
      message,
      '',
    ].join('\n'),
  )
}

export function pkt(data: string | Uint8Array): Uint8Array {
  const bytes = typeof data === 'string' ? Buffer.from(data) : data
  return new Uint8Array(
    Buffer.concat([
      Buffer.from((bytes.length + 4).toString(16).padStart(4, '0')),
      bytes,
    ]),
  )
}

export function advertisement(
  oid: string,
  options: {
    empty?: boolean
    sideband?: boolean
    tags?: readonly SourceTagFixture[]
  } = {},
) {
  const capabilities = `${options.sideband === false ? '' : 'side-band-64k '}ofs-delta no-progress include-tag`
  const first = options.empty
    ? `${'0'.repeat(40)} capabilities^{}`
    : `${oid} HEAD`
  return Buffer.concat([
    pkt('# service=git-upload-pack\n'),
    Buffer.from('0000'),
    pkt(`${first}\0${capabilities}\n`),
    ...(options.empty
      ? []
      : [
          pkt(`${oid} refs/heads/${SOURCE_BRANCH}\n`),
          pkt(
            Buffer.concat([
              Buffer.from(`${oid} refs/heads/another-`),
              Buffer.from([0xff, 0x0a]),
            ]),
          ),
          ...(options.tags ?? []).flatMap((tag) => [
            pkt(
              Buffer.concat([
                Buffer.from(`${tag.oid} `),
                tag.name,
                Buffer.from('\n'),
              ]),
            ),
            ...(tag.peeledOid
              ? [
                  pkt(
                    Buffer.concat([
                      Buffer.from(`${tag.peeledOid} `),
                      tag.name,
                      Buffer.from('^{}\n'),
                    ]),
                  ),
                ]
              : []),
          ]),
        ]),
    Buffer.from('0000'),
  ])
}

export function uploadResponse(pack: Uint8Array, sideband = true): Uint8Array {
  if (!sideband) return new Uint8Array(Buffer.concat([pkt('NAK\n'), pack]))
  const packets: Uint8Array[] = [pkt('NAK\n'), pkt('\x02Counting objects.\n')]
  for (let offset = 0; offset < pack.length; offset += 42_013) {
    packets.push(
      pkt(
        Buffer.concat([
          Buffer.from([1]),
          pack.subarray(offset, offset + 42_013),
        ]),
      ),
    )
  }
  packets.push(Buffer.from('0000'))
  return new Uint8Array(Buffer.concat(packets))
}

/** Split the framing headers, channel bytes, and pack data across network reads. */
export function fragmentedResponse(
  bytes: Uint8Array,
  contentType: string,
): Response {
  let offset = 0
  const chunks = [1, 2, 3, 7, 1_009, 16_381]
  let chunk = 0
  return new Response(
    new ReadableStream<Uint8Array>({
      pull(controller) {
        if (offset === bytes.length) return controller.close()
        const end = Math.min(
          bytes.length,
          offset + chunks[chunk++ % chunks.length],
        )
        controller.enqueue(bytes.slice(offset, end))
        offset = end
      },
    }),
    { headers: { 'Content-Type': contentType } },
  )
}
