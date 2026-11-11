import { statfs } from 'node:fs/promises'

import { ImportStorage } from './import-storage'
import { readImportJson } from './import-storage'
import { readImportManifestEntry } from '../../src/shared/conductor-import-manifest-read.ts'

export type ImportDiskMeasure = (
  path: string,
) => Promise<{ bsize: bigint; bavail: bigint }>

interface CheckoutAllocation {
  fileCount: number
  fileBytes: bigint
}

export class ImportDiskError extends Error {
  readonly code = 'import_disk_space'
  readonly requiredBytes: string
  readonly availableBytes: string
  constructor(requiredBytes: string, availableBytes: string) {
    super(
      `The stored work needs ${requiredBytes} bytes. The disk has ${availableBytes} bytes available. Your stored work is kept. Try again.`,
    )
    this.requiredBytes = requiredBytes
    this.availableBytes = availableBytes
  }
}

/** Peak allocations include retained staging and each separate restored destination. */
async function importDiskRequirement(
  storage: ImportStorage,
  block: bigint,
  prepared?: CheckoutAllocation,
) {
  const snapshot = await storage.snapshot()
  const allocated = (bytes: number | bigint) =>
    ((BigInt(bytes) + block - 1n) / block) * block
  let required = 0n
  let objectBytes = 0n
  let bundleBytes = 0n
  const objects = snapshot.gitDisk.reconstruction
  const tree = snapshot.gitDisk.checkout
  const lfs = snapshot.gitDisk.lfs
  const objectAllocation = async (id: string) => {
    const object = readImportManifestEntry(
      await readImportJson(storage.path('object', id)),
    )
    if (object.kind !== 'object')
      throw new Error('Missing import content object.')
    return allocated(object.restoredBytes)
  }
  for await (const entry of storage.entries()) {
    if (entry.kind === 'object') {
      if (!prepared)
        required += allocated(entry.sizeBytes) + allocated(entry.restoredBytes)
      objectBytes += BigInt(entry.sizeBytes)
      if (entry.purpose === 'bundle') bundleBytes += BigInt(entry.sizeBytes)
    }
    if (entry.kind === 'file') {
      required += (await objectAllocation(entry.objectId)) + block
    }
    if (entry.kind === 'directory' || entry.kind === 'symlink')
      required += block * 2n
    if (entry.kind === 'session') {
      const native = await objectAllocation(entry.memoryObjectId)
      const document = await objectAllocation(entry.documentObjectId)
      // Native/document destinations are separate even when their source object is shared.
      // The copied Codex header can grow by four bytes; its mapped staging copy is retained.
      const mapped = entry.agent === 'codex' ? native + block : 0n
      required +=
        native +
        document +
        mapped +
        (native > document ? native : document) +
        block * 4n
    }
  }
  if (objectBytes !== BigInt(snapshot.storedBytes))
    throw new Error('The import byte total does not match.')
  // A zlib stream's documented compressBound terms plus Git object headers.
  const inflated =
    BigInt(objects.inflatedBytes) + BigInt(objects.objectCount) * 24n
  // The completed PACK retains original compressed instructions and appends thin bases.
  if (!prepared) {
    required += allocated(bundleBytes)
    required += allocated(
      inflated +
        (inflated >> 12n) +
        (inflated >> 14n) +
        (inflated >> 25n) +
        BigInt(objects.objectCount) * 13n,
    )
    required +=
      BigInt(objects.objectCount) * block +
      allocated(BigInt(objects.objectCount) * 96n + 4096n)
  }
  required +=
    allocated(BigInt(tree.fileBytes) + BigInt(tree.symlinkBytes)) +
    BigInt(tree.fileCount + tree.directoryCount + tree.symlinkCount) * block
  required += allocated(
    BigInt(tree.pathBytes) +
      BigInt(tree.fileCount + tree.symlinkCount) * 96n +
      4096n,
  )
  if (prepared)
    required +=
      allocated(prepared.fileBytes) + BigInt(prepared.fileCount) * block
  else
    required +=
      allocated(lfs.cacheBytes) +
      allocated(lfs.checkoutBytes) +
      allocated(lfs.checkoutBytes) +
      BigInt(lfs.cacheObjectCount * 3 + lfs.checkoutPathCount) * block
  // Command/part receipts, object indexes, manifests and atomic metadata replacements.
  required +=
    BigInt(
      snapshot.recordCount +
        (prepared ? 0 : snapshot.partCount * 4 + snapshot.objectCount * 3) +
        32,
    ) * block
  return required
}

export async function preflightImport(
  storage: ImportStorage,
  cwd: string,
  measure: ImportDiskMeasure = (path) => statfs(path, { bigint: true }),
  prepared?: CheckoutAllocation,
) {
  const disk = await measure(cwd)
  const required = await importDiskRequirement(storage, disk.bsize, prepared)
  const available = disk.bavail * disk.bsize
  if (required > available)
    throw new ImportDiskError(String(required), String(available))
  return { requiredBytes: String(required), availableBytes: String(available) }
}
