import type {
  ImportDeviceFrame,
  ImportReservation,
} from '../../src/shared/conductor-import-operation.ts'
import type {
  ImportManifestEntry,
  ImportSnapshot,
} from '../../src/shared/conductor-import-manifest.ts'
import type { ImportPart } from '../../src/shared/conductor-import-storage.ts'
import type { DeviceToWorker } from '../../src/shared/device.ts'
import type { ImportLocations } from '../src/import/types.ts'

import { deferredImport } from './import-wait.ts'

/** @public Electron evaluate loads this entry through createRequire. */
export async function runImportMainFixture(
  appPath: string,
  input: ImportLocations,
) {
  const { resolve } = process.getBuiltinModule('node:path')
  const { createRequire } = process.getBuiltinModule('node:module')
  const load = createRequire(resolve(appPath, 'package.json'))
  const { createHash } = process.getBuiltinModule('node:crypto')
  const modulePath = (path: string) => resolve(appPath, 'dist/app', path)
  const { runImportJob }: typeof import('../src/import/worker-client.ts') =
    load(modulePath('desktop/src/import/worker-client.js'))
  const {
    createImportPreferences,
  }: typeof import('../src/import/preferences.ts') = load(
    modulePath('desktop/src/import/preferences.js'),
  )
  const { privateDeviceFiles }: typeof import('../src/device/files.js') = load(
    modulePath('desktop/src/device/files.js'),
  )
  const {
    createDeviceSessionFactory,
  }: typeof import('../src/device/session-factory.js') = load(
    modulePath('desktop/src/device/session-factory.js'),
  )
  const { localCommandLauncher }: typeof import('../src/device/process.js') =
    load(modulePath('desktop/src/device/process.js'))
  const { deviceClock }: typeof import('../src/device/clock.js') = load(
    modulePath('desktop/src/device/clock.js'),
  )
  const { workerMessage }: typeof import('../src/device/messages.js') = load(
    modulePath('desktop/src/device/messages.js'),
  )
  const {
    readImportDeviceFrame,
  }: typeof import('../../src/shared/conductor-import-operation-read.ts') =
    load(modulePath('src/shared/conductor-import-operation-read.js'))
  let prompts = 0
  let warnings = 0
  const files = privateDeviceFiles(resolve(input.userData, 'fixture-device'))
  const preferences = createImportPreferences({
    files,
    prompt: async () => {
      prompts++
      return true
    },
    warn: () => {
      warnings++
    },
  })
  const scan = deferredImport()
  const stopped = deferredImport()
  const completed = deferredImport()
  const frames: ImportDeviceFrame[] = []
  const fingerprints: string[] = []
  const stored = new Map<string, string>()
  const parts = new Map<string, ImportPart>()
  let manifest: ImportManifestEntry[] = []
  let snapshot: ImportSnapshot | undefined
  let phase: 'scan' | 'stop' | 'retry' = 'scan'
  let cursorZero = false
  let failure: string | null = null
  const reservation: ImportReservation = {
    id: 'reservation-main',
    localWorkspaceId: 'local-workspace',
    sourceFingerprint: null,
    createdAt: 1,
    expiresAt: Number.MAX_SAFE_INTEGER,
    storedBytes: 0,
    workspaceId: null,
  }
  const put = async (
    target: import('../../src/shared/conductor-import-storage.ts').ImportUploadTarget,
    bytes: Uint8Array<ArrayBuffer>,
  ) => {
    if (
      createHash('sha256').update(bytes).digest('hex') !==
        target.identity.part.sha256 ||
      bytes.byteLength !== target.identity.part.sizeBytes
    )
      throw new Error('Stored bytes changed')
    stored.set(target.identity.part.id, target.identity.part.sha256)
    return 200
  }
  const factory = createDeviceSessionFactory({
    files,
    deviceName: 'Fixture Mac',
    clock: deviceClock,
    launch: localCommandLauncher(),
    notify: () => () => undefined,
    warn: () => {
      warnings++
    },
    imports: {
      preferences,
      jobs: (job, signal) => runImportJob(input, job, signal),
      put,
    },
  })
  let session = factory.session(
    'user-one',
    { deviceId: 'fixture-mac', connectionId: 'first' },
    send,
    () => {
      throw new Error('Invalid device fixture message')
    },
  )
  function receive(value: unknown) {
    const message = workerMessage(JSON.stringify(value))
    if (!message) throw new Error('Import fixture frame was not parsed')
    session.receive(message)
  }
  function send(message: DeviceToWorker): boolean {
    if (message.type !== 'import.frame') return true
    const frame = readImportDeviceFrame(JSON.parse(JSON.stringify(message)))
    frames.push(frame)
    queueMicrotask(() => {
      const event = frame.event
      let result: unknown = { kind: 'accepted' }
      if (event.kind === 'failed') {
        failure = event.code
        scan.resolve()
        stopped.resolve()
        completed.resolve()
      }
      if (event.kind === 'reserve')
        result = { kind: 'reservation', reservation: { ...reservation } }
      if (event.kind === 'repository.facts')
        result = {
          kind: 'repository.facts',
          facts: {
            id: 'facts-main',
            repositoryId: 1,
            fullName: 'firna/repository',
            branch: 'feature',
            branchHeadOid: null,
            defaultBranch: 'main',
            defaultHeadOid: null,
            observedAt: 1,
          },
        }
      if (event.kind === 'snapshot') {
        snapshot = event.snapshot
        reservation.sourceFingerprint = event.snapshot.sourceFingerprint
        fingerprints.push(event.snapshot.sourceFingerprint)
        manifest = []
      }
      if (event.kind === 'manifest') {
        if (event.offset !== manifest.length)
          throw new Error('Manifest offset changed')
        manifest.push(...event.entries)
        for (const entry of event.entries)
          if (entry.kind === 'part') parts.set(entry.part.id, entry.part)
      }
      if (event.kind === 'manifest.end') {
        if (manifest.length !== snapshot?.recordCount)
          throw new Error('Manifest did not close')
        if (phase === 'stop') {
          stopped.resolve()
          return
        }
      }
      if (event.kind === 'missing') {
        if (event.cursor === 0) {
          cursorZero = true
          result = { kind: 'missing', parts: [], nextCursor: 1 }
        } else
          result = {
            kind: 'missing',
            parts: [...parts.values()].filter((part) => !stored.has(part.id)),
            nextCursor: null,
          }
      }
      if (event.kind === 'target') {
        const part = parts.get(event.partId)
        if (!part) throw new Error('Target did not name a declared part')
        result = {
          kind: 'target',
          target: {
            method: 'PUT',
            url: 'https://private-fixture.invalid/' + part.id,
            headers: { 'Content-Length': String(part.sizeBytes) },
            expiresAt: Number.MAX_SAFE_INTEGER,
            identity: {
              scope: { orgId: 'org-one', reservationId: reservation.id },
              part,
              uploadId: 'fixture-upload',
            },
          },
        }
      }
      if (event.kind === 'verify') {
        const part = parts.get(event.partId)
        if (!part) throw new Error('Verify did not name a declared part')
        stored.set(part.id, part.sha256)
        reservation.storedBytes = [...parts.values()]
          .filter((item) => stored.has(item.id))
          .reduce((sum, item) => sum + item.sizeBytes, 0)
        result = {
          kind: 'verified',
          verified: true,
          storedBytes: reservation.storedBytes,
        }
      }
      if (event.kind === 'progress')
        result = { kind: 'reservation', reservation: { ...reservation } }
      if (event.kind === 'complete')
        result = { kind: 'complete', workspaceId: 'workspace-imported' }
      receive({
        type: 'import.ack',
        operationId: frame.operationId,
        sequence: frame.sequence,
        result,
      })
      if (event.kind === 'done') {
        if (phase === 'scan') scan.resolve()
        else completed.resolve()
      }
    })
    return true
  }
  try {
    receive({
      type: 'import.operation',
      orgId: 'org-one',
      operationId: 'scan-main',
      operation: { action: 'scan' },
    })
    await scan.promise
    phase = 'stop'
    receive({
      type: 'import.operation',
      orgId: 'org-one',
      operationId: 'upload-main',
      operation: { action: 'upload', localWorkspaceId: 'local-workspace' },
    })
    await stopped.promise
    session.dispose()
    const countAfterStop = frames.length
    phase = 'retry'
    session = factory.session(
      'user-one',
      { deviceId: 'fixture-mac', connectionId: 'second' },
      send,
      () => {
        throw new Error('Invalid device fixture pairing')
      },
    )
    const automaticFrames = frames.length - countAfterStop
    receive({
      type: 'import.operation',
      orgId: 'org-one',
      operationId: 'retry-main',
      operation: {
        action: 'retry',
        localWorkspaceId: 'local-workspace',
        reservationId: reservation.id,
      },
    })
    await completed.promise
    return {
      failure,
      prompts,
      warnings,
      fingerprints,
      automaticFrames,
      cursorZero,
      storedParts: stored.size,
      declaredParts: parts.size,
      snapshot,
      files: manifest.filter((entry) =>
        ['file', 'directory', 'delete', 'symlink'].includes(entry.kind),
      ),
      native: manifest.filter((entry) => entry.kind === 'session'),
      omittedSessions: frames.flatMap((frame) =>
        frame.event.kind === 'result.sessions' ? frame.event.sessions : [],
      ),
      scanRows: frames.flatMap((frame) =>
        frame.event.kind === 'scan' ? frame.event.rows : [],
      ),
    }
  } finally {
    session.dispose()
    factory.dispose()
  }
}
