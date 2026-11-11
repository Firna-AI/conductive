import { mkdir, rm, lstat } from 'node:fs/promises'

import type { RunnerImportAction } from '../../src/shared/runner-import.ts'
import { prepareContextExclude } from './context-folder'
import { checkoutImport } from './import-checkout'
import { preflightImport, type ImportDiskMeasure } from './import-disk'
import { importGit, prepareImportGit, verifyImportTree } from './import-git'
import { restoreImportBundle } from './import-git-pack'
import { prepareImportLfs, materializeImportLfs } from './import-lfs'
import type { ImportLfsTransport } from './import-lfs-transport'
import { restoreImportSession } from './import-native'
import { importObjectPath, materializeImportObject } from './import-objects'
import {
  replaceImportFile,
  restoreImportDirectory,
  restoreImportDirectoryMode,
  restoreImportLink,
  withImportDestination,
} from './import-paths'
import { ImportStorage } from './import-storage'
import type { EventStore } from './state'

export async function applyImport(
  storage: ImportStorage,
  input: Extract<RunnerImportAction, { kind: 'open' }>,
  cwd: string,
  home: string,
  store: EventStore,
  activationId: string,
  signal: AbortSignal,
  lfs?: ImportLfsTransport,
  measureDisk?: ImportDiskMeasure,
) {
  const snapshot = input.snapshot
  for await (const entry of storage.entries())
    if (entry.kind === 'object')
      await materializeImportObject(storage, entry, signal)
  await storage.mark('git', async () => {
    const tracks = await prepareImportGit(
      storage,
      cwd,
      activationId,
      input.defaultBranch,
      signal,
    )
    if (snapshot.bundleObjectId) {
      const bundle = await importObjectPath(
        storage,
        snapshot.bundleObjectId,
        signal,
      )
      await restoreImportBundle(
        storage,
        cwd,
        activationId,
        snapshot,
        bundle,
        signal,
      )
    }
    await verifyImportTree(cwd, activationId, snapshot, signal)
    const pendingLfs = await prepareImportLfs(
      storage,
      cwd,
      activationId,
      snapshot,
      signal,
      lfs,
    )
    await preflightImport(storage, cwd, measureDisk, pendingLfs)
    await checkoutImport(storage, cwd, activationId, snapshot, signal)
    if (tracks)
      await importGit(cwd, activationId, signal, [
        'branch',
        '--set-upstream-to',
        `origin/${snapshot.branch}`,
        snapshot.branch,
      ])
    if (
      (await importGit(cwd, activationId, signal, ['rev-parse', 'HEAD'])) !==
      snapshot.headOid
    )
      throw new Error('The imported HEAD does not match.')
  })
  await materializeImportLfs(storage, cwd, snapshot, signal)
  let maximumDepth = 0
  for await (const entry of storage.entries())
    if (entry.kind === 'directory')
      maximumDepth = Math.max(maximumDepth, entry.path.split('/').length)
  for (let depth = 1; depth <= maximumDepth; depth++)
    for await (const entry of storage.entries()) {
      signal.throwIfAborted()
      if (entry.kind === 'directory' && entry.path.split('/').length === depth)
        await restoreImportDirectory(cwd, entry.path, entry.mode | 0o700)
    }
  for await (const entry of storage.entries()) {
    signal.throwIfAborted()
    if (entry.kind === 'delete')
      await storage.mark(`delete:${entry.path}`, () =>
        withImportDestination(cwd, entry.path, (path) =>
          rm(path, { force: true, recursive: true }),
        ),
      )
    if (entry.kind === 'file')
      await storage.mark(`file:${entry.path}`, async () =>
        replaceImportFile(
          cwd,
          entry.path,
          await importObjectPath(storage, entry.objectId, signal),
          entry.mode === '100755' ? 0o755 : 0o644,
        ),
      )
    if (entry.kind === 'symlink')
      await storage.mark(`link:${entry.path}`, () =>
        restoreImportLink(cwd, entry.path, entry.target),
      )
  }
  await storage.mark('context', async () => {
    // This runs only after the preflight. Destination checks run before the shared helper.
    await withImportDestination(cwd, '.context/attachments', async (path) => {
      const existing = await lstat(path).catch((error: unknown) => {
        if (
          error instanceof Error &&
          'code' in error &&
          error.code === 'ENOENT'
        )
          return null
        throw error
      })
      if (!existing) await mkdir(path, { mode: 0o700 })
    })
    await prepareContextExclude(cwd)
  })
  for await (const entry of storage.entries()) {
    signal.throwIfAborted()
    if (entry.kind === 'session')
      await storage.mark(`session:${entry.id}`, () =>
        restoreImportSession(storage, entry, cwd, home, store, signal),
      )
  }
  for (let depth = maximumDepth; depth > 0; depth--)
    for await (const entry of storage.entries()) {
      if (entry.kind === 'directory' && entry.path.split('/').length === depth)
        await restoreImportDirectoryMode(cwd, entry.path, entry.mode)
    }
}
