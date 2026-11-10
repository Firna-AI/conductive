import { expect, it } from 'vitest'

import {
  readImportManifestEntry,
  readImportSnapshot,
} from '../../src/shared/conductor-import-manifest-read.ts'
import { readImportPublicEvent } from '../../src/shared/conductor-import-public-read.ts'
import { readImportDeviceFrame } from '../../src/shared/conductor-import-operation-read.ts'
import {
  importPage,
  importWire,
} from '../../src/shared/conductor-import-pages.ts'
import { SNAPSHOT } from './manifest.test-support'
import { sendImportControl, sendImportFrame } from './broker-socket'
import { readImportWorkerFrame } from '../../src/shared/conductor-import-control-read.ts'
import type { WorkerToDevice } from '../../src/shared/device.ts'
import { held } from './storage.test-support'
import { invalidGitDiskSnapshots } from './git-disk.test-support'

it('preserves exact restoration entries and refuses unsafe paths, hashes and inconsistent Git identities', () => {
  expect(
    readImportManifestEntry({
      kind: 'file',
      path: 'folder/a\\b',
      mode: '100755',
      objectId: 'bytes',
    }),
  ).toEqual({
    kind: 'file',
    path: 'folder/a\\b',
    mode: '100755',
    objectId: 'bytes',
  })
  expect(
    readImportManifestEntry({
      kind: 'symlink',
      path: '.context/link',
      target: '/outside/exact',
    }),
  ).toEqual({
    kind: 'symlink',
    path: '.context/link',
    target: '/outside/exact',
  })
  expect(
    readImportManifestEntry({
      kind: 'object',
      id: 'memory',
      purpose: 'memory',
      encoding: 'zstd',
      sizeBytes: 4,
      restoredBytes: 12,
      partCount: 1,
    }),
  ).toMatchObject({ encoding: 'zstd', restoredBytes: 12 })
  expect(() =>
    readImportManifestEntry({ kind: 'delete', path: '../outside' }),
  ).toThrow('The import data is not valid.')
  expect(() =>
    readImportManifestEntry({ kind: 'delete', path: '.git/config' }),
  ).toThrow('The import data is not valid.')
  expect(() =>
    readImportManifestEntry({
      kind: 'part',
      objectId: 'bundle',
      index: 0,
      part: { id: 'bad', group: 'work', sizeBytes: 1, sha256: 'not-a-hash' },
    }),
  ).toThrow('The import data is not valid.')
  expect(() =>
    readImportSnapshot({ ...SNAPSHOT, objectFormat: 'sha256' }),
  ).toThrow('The import data is not valid.')
  expect(
    readImportSnapshot(JSON.parse(JSON.stringify(SNAPSHOT))).gitDisk,
  ).toEqual({
    version: 1,
    treeOid: 'cccccccccccccccccccccccccccccccccccccccc',
    reconstruction: {
      objectCount: 4,
      inflatedBytes: 16384,
      maxObjectBytes: 8192,
    },
    checkout: {
      fileCount: 3,
      fileBytes: 4352,
      directoryCount: 2,
      symlinkCount: 1,
      symlinkBytes: 9,
      pathBytes: 73,
    },
    lfs: {
      cacheObjectCount: 1,
      cacheBytes: 8192,
      checkoutPathCount: 2,
      checkoutBytes: 16384,
    },
  })
  for (const { name, value } of invalidGitDiskSnapshots)
    expect(() => readImportSnapshot(value), name).toThrow(
      'The import data is not valid.',
    )
  expect(
    readImportSnapshot({
      ...SNAPSHOT,
      bundleObjectId: null,
      gitDisk: {
        ...SNAPSHOT.gitDisk,
        reconstruction: { objectCount: 0, inflatedBytes: 0, maxObjectBytes: 0 },
      },
    }).gitDisk.reconstruction,
  ).toEqual({ objectCount: 0, inflatedBytes: 0, maxObjectBytes: 0 })
  expect(
    readImportSnapshot({
      ...SNAPSHOT,
      objectFormat: 'sha256',
      headOid: 'a'.repeat(64),
      gitDisk: { ...SNAPSHOT.gitDisk, treeOid: 'c'.repeat(64) },
    }).gitDisk.treeOid,
  ).toBe('c'.repeat(64))
  expect(
    readImportSnapshot({
      ...SNAPSHOT,
      gitDisk: {
        ...SNAPSHOT.gitDisk,
        reconstruction: {
          objectCount: 2,
          inflatedBytes: Number.MAX_SAFE_INTEGER,
          maxObjectBytes: 4503599627370496,
        },
      },
    }).gitDisk.reconstruction.inflatedBytes,
  ).toBe(Number.MAX_SAFE_INTEGER)
})

it('pages encoded escaped metadata and excludes private controls and source fields from renderer events', () => {
  const rows = Array.from({ length: 4 }, (_, index) => ({
    localWorkspaceId: String(index),
    name: '"\\\n'.repeat(50_000),
    repository: 'example/repository',
    branch: 'work',
    sessionCount: 1,
    uploadBytes: 29,
  }))
  const page = importPage(rows, (rows) => ({ kind: 'scan', rows }))
  expect(page.length).toBe(3)
  expect(
    new TextEncoder().encode(importWire({ kind: 'scan', rows: page }))
      .byteLength,
  ).toBeLessThan(1_000_000)
  const frame = readImportDeviceFrame({
    type: 'import.frame',
    operationId: 'operation',
    sequence: 0,
    event: {
      kind: 'scan',
      rows: [
        {
          ...rows[0],
          name: 'Safe name',
          sourcePath: '/private/source',
          rawHistory: 'private',
        },
      ],
    },
  })
  expect(frame.event).toEqual({
    kind: 'scan',
    rows: [{ ...rows[0], name: 'Safe name' }],
  })
  expect(
    readImportDeviceFrame({
      type: 'import.frame',
      operationId: 'operation',
      sequence: 1,
      event: {
        kind: 'scan',
        rows: [
          {
            localWorkspaceId: 'partial',
            name: 'Partial source',
            repository: '/private/source',
            branch: null,
            sessionCount: null,
            uploadBytes: null,
          },
        ],
      },
    }).event,
  ).toEqual({
    kind: 'scan',
    rows: [
      {
        localWorkspaceId: 'partial',
        name: 'Partial source',
        repository: null,
        branch: null,
        sessionCount: null,
        uploadBytes: null,
      },
    ],
  })
  expect(() =>
    readImportPublicEvent({
      kind: 'target',
      target: { url: 'https://private-upload.test' },
    }),
  ).toThrow()
})

it('waits for each bounded private prerequisite fragment before sending its final acknowledgement', async () => {
  const entered = held<void>()
  const release = held<void>()
  const sent: WorkerToDevice[] = []
  const connection = {
    device: { deviceId: 'mac', connectionId: 'connection' },
    deviceName: 'Mac',
    userId: 'user',
    sessionId: 'session',
    lastSeen: 1,
    send: (message: WorkerToDevice) => {
      sent.push(message)
    },
    close: () => undefined,
  }
  const verified = Array.from({ length: 10_000 }, (_, index) => ({
    oid: index.toString(16).padStart(40, '0'),
    headOid: 'a'.repeat(40),
  }))
  const sending = sendImportControl(
    connection,
    'operation',
    3,
    {
      kind: 'repository.prerequisites',
      receiptId: 'receipt',
      verified,
      missing: [],
    },
    async (frame) => {
      sendImportFrame(connection, frame)
      if (frame.page === 0) {
        entered.resolve()
        await release.promise
      }
    },
  )
  await entered.promise
  expect(sent.map((frame) => frame.type)).toEqual(['import.part'])
  release.resolve()
  await sending
  const parsed = sent.map(readImportWorkerFrame)
  expect(parsed.map((frame) => frame.type)).toEqual([
    'import.part',
    'import.part',
    'import.ack',
  ])
  const parts = parsed.flatMap((frame) =>
    frame.type === 'import.part' ? frame.result.verified : [],
  )
  expect(parts).toEqual(verified)
  for (const frame of sent)
    expect(new TextEncoder().encode(importWire(frame)).byteLength).toBeLessThan(
      1_000_000,
    )
  expect(parsed.at(-1)).toEqual({
    type: 'import.ack',
    operationId: 'operation',
    sequence: 3,
    result: {
      kind: 'repository.prerequisites',
      receiptId: 'receipt',
      verified: [],
      missing: [],
    },
  })
})
