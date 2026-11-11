import type { ImportSnapshot } from '../../src/shared/conductor-import-manifest'
import { importGit } from './import-git'
import { importTreeEntries } from './import-git-tree'
import {
  downloadImportLfs,
  type ImportLfsTransport,
} from './import-lfs-transport'
import { replaceImportFile } from './import-paths'
import { ImportStorage, readImportJson, saveImportJson } from './import-storage'

function pointer(text: string): { oid: string; size: number } | null {
  if (
    !text.startsWith('version https://git-lfs.github.com/spec/v1\n') &&
    !text.startsWith('version https://hawser.github.com/spec/v1\n')
  )
    return null
  const oid = text.match(/^oid sha256:([a-f0-9]{64})$/m)?.[1]
  const size = text.match(/^size ([0-9]+)$/m)?.[1]
  if (!oid || size === undefined || !Number.isSafeInteger(Number(size)))
    return null
  return { oid, size: Number(size) }
}

export async function prepareImportLfs(
  storage: ImportStorage,
  cwd: string,
  activationId: string,
  snapshot: ImportSnapshot,
  signal: AbortSignal,
  transport?: ImportLfsTransport,
) {
  const overrides = new Set<string>()
  const directories = new Set<string>()
  for await (const entry of storage.entries()) {
    if (
      entry.kind === 'file' ||
      entry.kind === 'symlink' ||
      entry.kind === 'delete'
    )
      overrides.add(entry.path)
    if (entry.kind === 'directory') directories.add(entry.path)
  }
  const replaced = (path: string) => {
    const pieces = path.split('/')
    return (
      directories.has(path) ||
      pieces.some((_piece, index) =>
        overrides.has(pieces.slice(0, index + 1).join('/')),
      )
    )
  }
  const objects = new Map<string, number>()
  let paths = 0,
    bytes = 0n
  let fileCount = 0,
    fileBytes = 0n
  for await (const entry of importTreeEntries(cwd, snapshot.headOid, signal)) {
    if (
      (entry.mode !== '100644' && entry.mode !== '100755') ||
      entry.size >= 1024
    )
      continue
    const payload = pointer(
      await importGit(cwd, activationId, signal, [
        'cat-file',
        'blob',
        entry.oid,
      ]),
    )
    if (!payload) continue
    if (objects.has(payload.oid) && objects.get(payload.oid) !== payload.size)
      throw new Error('The LFS pointer sizes do not match.')
    objects.set(payload.oid, payload.size)
    paths++
    bytes += BigInt(payload.size)
    const overridden = replaced(entry.path)
    if (!overridden) {
      fileCount++
      fileBytes += BigInt(payload.size)
    }
    await saveImportJson(storage.path('lfs-path', entry.path), {
      ...payload,
      mode: entry.mode,
      replaced: overridden,
    })
  }
  const facts = snapshot.gitDisk.lfs
  const cacheBytes = [...objects.values()].reduce(
    (total, size) => total + BigInt(size),
    0n,
  )
  if (
    objects.size !== facts.cacheObjectCount ||
    cacheBytes !== BigInt(facts.cacheBytes) ||
    paths !== facts.checkoutPathCount ||
    bytes !== BigInt(facts.checkoutBytes)
  )
    throw new Error('The imported LFS facts do not match.')
  // Resolve every needed payload before changing the checkout. Overlays need no remote payload.
  for await (const entry of importTreeEntries(cwd, snapshot.headOid, signal)) {
    const value = await readImportJson(storage.path('lfs-path', entry.path))
    if (
      typeof value !== 'object' ||
      value === null ||
      !('replaced' in value) ||
      value.replaced !== false ||
      !('oid' in value) ||
      typeof value.oid !== 'string' ||
      !('size' in value) ||
      typeof value.size !== 'number'
    )
      continue
    await downloadImportLfs(
      storage,
      snapshot.repository,
      value.oid,
      value.size,
      activationId,
      signal,
      transport,
    )
  }
  return { fileCount, fileBytes }
}

export async function materializeImportLfs(
  storage: ImportStorage,
  cwd: string,
  snapshot: ImportSnapshot,
  signal: AbortSignal,
) {
  for await (const entry of importTreeEntries(cwd, snapshot.headOid, signal)) {
    const value = await readImportJson(storage.path('lfs-path', entry.path))
    if (
      typeof value !== 'object' ||
      value === null ||
      !('replaced' in value) ||
      value.replaced !== false ||
      !('oid' in value) ||
      typeof value.oid !== 'string'
    )
      continue
    const source = storage.path('lfs-bytes', value.oid)
    await storage.mark(`lfs:${entry.path}`, () =>
      replaceImportFile(
        cwd,
        entry.path,
        source,
        entry.mode === '100755' ? 0o755 : 0o644,
      ),
    )
  }
}
