import type {
  ImportGitDiskFacts,
  ImportSnapshot,
} from './conductor-import-manifest.ts'
import {
  ImportContractError,
  importInteger,
  importObject,
  importOid,
} from './conductor-import-values.ts'

export function readImportGitDisk(
  value: unknown,
  objectFormat: ImportSnapshot['objectFormat'],
  bundleObjectId: string | null,
): ImportGitDiskFacts {
  const row = importObject(value)
  const treeOid = importOid(row.treeOid)
  if (
    row.version !== 1 ||
    treeOid.length !== (objectFormat === 'sha1' ? 40 : 64)
  )
    throw new ImportContractError()
  const reconstruction = importObject(row.reconstruction)
  const checkout = importObject(row.checkout)
  const lfs = importObject(row.lfs)
  const facts: ImportGitDiskFacts = {
    version: 1,
    treeOid,
    reconstruction: {
      objectCount: importInteger(reconstruction.objectCount),
      inflatedBytes: importInteger(reconstruction.inflatedBytes),
      maxObjectBytes: importInteger(reconstruction.maxObjectBytes),
    },
    checkout: {
      fileCount: importInteger(checkout.fileCount),
      fileBytes: importInteger(checkout.fileBytes),
      directoryCount: importInteger(checkout.directoryCount),
      symlinkCount: importInteger(checkout.symlinkCount),
      symlinkBytes: importInteger(checkout.symlinkBytes),
      pathBytes: importInteger(checkout.pathBytes),
    },
    lfs: {
      cacheObjectCount: importInteger(lfs.cacheObjectCount),
      cacheBytes: importInteger(lfs.cacheBytes),
      checkoutPathCount: importInteger(lfs.checkoutPathCount),
      checkoutBytes: importInteger(lfs.checkoutBytes),
    },
  }
  const objects = facts.reconstruction
  const tree = facts.checkout
  const payloads = facts.lfs
  const pathCount =
    BigInt(tree.fileCount) +
    BigInt(tree.directoryCount) +
    BigInt(tree.symlinkCount)
  if (
    (bundleObjectId === null
      ? objects.objectCount !== 0
      : objects.objectCount === 0 || objects.inflatedBytes === 0) ||
    objects.maxObjectBytes > objects.inflatedBytes ||
    BigInt(objects.inflatedBytes) >
      BigInt(objects.objectCount) * BigInt(objects.maxObjectBytes) ||
    (tree.fileCount === 0 && tree.fileBytes !== 0) ||
    (tree.symlinkCount === 0 && tree.symlinkBytes !== 0) ||
    (pathCount === 0n
      ? tree.pathBytes !== 0
      : BigInt(tree.pathBytes) < pathCount) ||
    payloads.cacheObjectCount > payloads.checkoutPathCount ||
    payloads.checkoutPathCount > tree.fileCount ||
    (payloads.cacheObjectCount === 0 &&
      (payloads.cacheBytes !== 0 || payloads.checkoutPathCount !== 0)) ||
    (payloads.checkoutPathCount === 0 && payloads.checkoutBytes !== 0) ||
    payloads.cacheBytes > payloads.checkoutBytes ||
    (payloads.cacheObjectCount === payloads.checkoutPathCount &&
      payloads.cacheBytes !== payloads.checkoutBytes) ||
    (payloads.cacheObjectCount === 1 &&
      BigInt(payloads.checkoutBytes) !==
        BigInt(payloads.cacheBytes) * BigInt(payloads.checkoutPathCount))
  )
    throw new ImportContractError()
  return facts
}
