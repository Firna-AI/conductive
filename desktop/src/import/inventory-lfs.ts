import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { GitInput } from './git.ts'
import type { SourceFile } from './types.ts'
import { LocalImportError } from './types.ts'

type LfsPointer = NonNullable<SourceFile['lfs']>
type Git = (args: string[], input?: GitInput) => Promise<string>

function readPointer(
  bytes: Buffer,
): Pick<LfsPointer, 'payloadOid' | 'size'> | null {
  const match =
    /^version https:\/\/git-lfs.github.com\/spec\/v1\r?\n(?:ext-[^\n]+\r?\n)*oid sha256:([a-f0-9]{64})\r?\nsize ([0-9]+)\r?\n?$/.exec(
      bytes.toString('utf8'),
    )
  return match && Number.isSafeInteger(Number(match[2]))
    ? { payloadOid: match[1], size: Number(match[2]) }
    : null
}

/** Read only tiny raw blobs, with one bounded output per fixed batch. */
async function pointerBlobs(git: Git, blobs: Map<string, number>) {
  const pointers = new Map<string, Pick<LfsPointer, 'payloadOid' | 'size'>>()
  const directory = await mkdtemp(join(tmpdir(), 'conductive-import-lfs-'))
  try {
    const ids = [...blobs.keys()]
    for (let start = 0; start < ids.length; start += 256) {
      const batch = ids.slice(start, start + 256)
      const output = join(directory, String(start))
      await git(['cat-file', '--batch'], {
        input: batch.join('\n') + '\n',
        output,
      })
      const bytes = await readFile(output)
      let offset = 0
      for (const oid of batch) {
        const end = bytes.indexOf(10, offset)
        const [actualOid, kind, size] = bytes
          .subarray(offset, end)
          .toString('ascii')
          .split(' ')
        const length = Number(size)
        if (
          end < offset ||
          actualOid !== oid ||
          kind !== 'blob' ||
          length !== blobs.get(oid) ||
          bytes[end + length + 1] !== 10
        )
          throw new LocalImportError('read_failed')
        const pointer = readPointer(bytes.subarray(end + 1, end + length + 1))
        if (pointer) pointers.set(oid, pointer)
        offset = end + length + 2
      }
      if (offset !== bytes.length) throw new LocalImportError('read_failed')
    }
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
  return pointers
}

/** Literal pointer working files also need overlays to preserve their bytes. */
export async function selectedLfsPointers(
  git: Git,
  headOid: string,
  paths: Set<string>,
) {
  const entries: { path: string; blobOid: string; mode: LfsPointer['mode'] }[] =
    []
  const blobs = new Map<string, number>()
  const tree = await git(['ls-tree', '-r', '-l', '-z', headOid])
  for (const row of tree.split('\0')) {
    const separator = row.indexOf('\t')
    if (separator < 0) continue
    const path = row.slice(separator + 1)
    const [mode, kind, blobOid, length] = row.slice(0, separator).split(/\s+/)
    if (
      kind !== 'blob' ||
      (mode !== '100644' && mode !== '100755') ||
      Number(length) >= 1024
    )
      continue
    entries.push({ path, blobOid, mode })
    blobs.set(blobOid, Number(length))
  }
  const known = await pointerBlobs(git, blobs)
  const result = new Map<string, LfsPointer>()
  for (const entry of entries) {
    const pointer = known.get(entry.blobOid)
    if (!pointer) continue
    paths.add(entry.path)
    result.set(entry.path, {
      blobOid: entry.blobOid,
      mode: entry.mode,
      ...pointer,
    })
  }
  return result
}
