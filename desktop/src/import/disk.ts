import { createReadStream } from 'node:fs'
import { join } from 'node:path'
import type { ImportGitDiskFacts } from '../../../src/shared/conductor-import-manifest.ts'
import { git } from './git.ts'
import { reconstructedObjects } from './disk-objects.ts'
import type { SourceInventory } from './types.ts'
import { LocalImportError } from './types.ts'

async function* treeRows(path: string, signal: AbortSignal) {
  let pending = Buffer.alloc(0)
  const stream = createReadStream(path, { signal })
  for await (const chunk of stream) {
    signal.throwIfAborted()
    pending = Buffer.concat([pending, chunk])
    let end: number
    while ((end = pending.indexOf(0)) !== -1) {
      yield pending.subarray(0, end)
      pending = pending.subarray(end + 1)
    }
  }
  if (pending.length) throw new LocalImportError('read_failed')
}

export async function measureGitDisk(
  sourceDirectory: string,
  directory: string,
  source: SourceInventory,
  bundle: string | null,
  signal: AbortSignal,
): Promise<ImportGitDiskFacts> {
  const repository = join(sourceDirectory, 'repository.git')
  const treeOid = (
    await git(repository, ['rev-parse', `${source.headOid}^{tree}`], signal)
  ).trim()
  const checkout = {
    fileCount: 0,
    fileBytes: 0,
    directoryCount: 0,
    symlinkCount: 0,
    symlinkBytes: 0,
    pathBytes: 0,
  }
  const lfs = {
    cacheObjectCount: 0,
    cacheBytes: 0,
    checkoutPathCount: 0,
    checkoutBytes: 0,
  }
  const payloads = new Map<string, number>()
  const pointers = new Map<string, { oid: string; size: number } | null>()
  const listing = join(directory, 'head-tree')
  await git(
    repository,
    ['ls-tree', '-r', '-t', '-l', '-z', source.headOid],
    signal,
    { output: listing },
  )
  for await (const row of treeRows(listing, signal)) {
    const separator = row.indexOf(9)
    if (separator < 0) throw new LocalImportError('read_failed')
    const [mode, type, oid, length] = row
      .subarray(0, separator)
      .toString('utf8')
      .trim()
      .split(/\s+/)
    checkout.pathBytes += row.length - separator - 1
    if (type === 'tree' || mode === '160000') checkout.directoryCount++
    else if (mode === '120000') {
      checkout.symlinkCount++
      checkout.symlinkBytes += Number(length)
    } else {
      const size = Number(length)
      checkout.fileCount++
      checkout.fileBytes += size
      // Git LFS recognizes pointer blobs only below its 1024-byte cutoff.
      if (size >= 1024) continue
      if (!pointers.has(oid)) {
        const text = await git(repository, ['cat-file', 'blob', oid], signal)
        const match =
          /^version https:\/\/git-lfs.github.com\/spec\/v1\n(?:ext-[^\n]+\n)*oid sha256:([a-f0-9]{64})\nsize ([0-9]+)\n?$/.exec(
            text,
          )
        pointers.set(
          oid,
          match ? { oid: match[1], size: Number(match[2]) } : null,
        )
      }
      const pointer = pointers.get(oid)
      if (pointer) {
        payloads.set(pointer.oid, pointer.size)
        lfs.checkoutPathCount++
        lfs.checkoutBytes += pointer.size
      }
    }
  }
  lfs.cacheObjectCount = payloads.size
  lfs.cacheBytes = [...payloads.values()].reduce((sum, bytes) => sum + bytes, 0)
  return {
    version: 1,
    treeOid,
    reconstruction: await reconstructedObjects(
      sourceDirectory,
      directory,
      source,
      bundle,
      signal,
    ),
    checkout,
    lfs,
  }
}
