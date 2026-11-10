import { createHash } from 'node:crypto'
import type { ImportScanRow } from '../../src/shared/conductor-import-operation.ts'
import { readImportSnapshot } from '../../src/shared/conductor-import-manifest-read.ts'
import type { ImportManifestEntry } from '../../src/shared/conductor-import-manifest.ts'
import type { ImportStage } from '../src/import/types.ts'

export function uploadStageFixture() {
  const row: ImportScanRow = {
    localWorkspaceId: 'local-one',
    name: 'Work',
    branch: 'feature',
    repository: 'firna/repository',
    sessionCount: 0,
    uploadBytes: 3,
  }
  const bytes = new Uint8Array([1, 2, 3])
  const part = {
    group: 'work',
    id: 'part-one',
    sizeBytes: 3,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  } as const
  const stage: ImportStage = {
    id: 'stage-one',
    sourceDigest: 'd'.repeat(64),
    row,
    headOid: 'c'.repeat(40),
    candidates: ['b'.repeat(40)],
    snapshot: readImportSnapshot({
      version: 1,
      sourceFingerprint: 'a'.repeat(64),
      localWorkspaceId: 'local-one',
      repository: 'firna/repository',
      branch: 'feature',
      headOid: 'c'.repeat(40),
      objectFormat: 'sha1',
      bundleObjectId: 'bundle',
      recordCount: 3,
      objectCount: 1,
      partCount: 1,
      sessionCount: 0,
      storedBytes: 3,
      restoredBytes: 3,
      gitDisk: {
        version: 1,
        treeOid: 'e'.repeat(40),
        reconstruction: { objectCount: 1, inflatedBytes: 1, maxObjectBytes: 1 },
        checkout: {
          fileCount: 0,
          fileBytes: 0,
          directoryCount: 0,
          symlinkCount: 0,
          symlinkBytes: 0,
          pathBytes: 0,
        },
        lfs: {
          cacheObjectCount: 0,
          cacheBytes: 0,
          checkoutPathCount: 0,
          checkoutBytes: 0,
        },
      },
    }),
  }
  const manifest: ImportManifestEntry[] = [
    {
      kind: 'object',
      id: 'bundle',
      purpose: 'bundle',
      encoding: 'identity',
      sizeBytes: 3,
      restoredBytes: 3,
      partCount: 1,
    },
    { kind: 'part', objectId: 'bundle', index: 0, part },
    { kind: 'prerequisite', oid: 'b'.repeat(40), receiptId: 'receipt-one' },
  ]
  return { row, bytes, part, stage, manifest }
}
