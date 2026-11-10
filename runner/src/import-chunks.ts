import { constants } from 'node:fs'
import { open } from 'node:fs/promises'

import { readImportManifestEntry } from '../../src/shared/conductor-import-manifest-read.ts'
import type { RunnerImportAction } from '../../src/shared/runner-import.ts'
import {
  ImportStorage,
  importDigest,
  readImportJson,
  saveImportJson,
} from './import-storage'

export async function receiveImportChunk(
  storage: ImportStorage,
  action: Extract<RunnerImportAction, { kind: 'chunk' }>,
) {
  const declaration = readImportManifestEntry(
    await readImportJson(storage.path('part', action.part.id)),
  )
  if (
    declaration.kind !== 'part' ||
    JSON.stringify(declaration.part) !== JSON.stringify(action.part)
  )
    throw new Error('The import part does not match its manifest.')
  const bytes = Buffer.from(action.base64, 'base64')
  if (
    bytes.toString('base64') !== action.base64 ||
    bytes.length !== action.length ||
    importDigest(bytes) !== action.sha256
  )
    throw new Error('The import range hash does not match.')
  if (
    action.offset + action.length > action.part.sizeBytes ||
    (!action.length && action.part.sizeBytes)
  )
    throw new Error('The import range is not valid.')
  const progressPath = storage.path('progress', action.part.id)
  const progress = (await readImportJson(progressPath)) ?? 0
  if (typeof progress !== 'number' || action.offset > progress)
    throw new Error('The import range is out of order.')
  const path = storage.path('bytes', action.part.id)
  const file = await open(
    path,
    constants.O_RDWR | constants.O_CREAT | constants.O_NOFOLLOW,
    0o600,
  )
  try {
    let offset = 0
    while (offset < bytes.length) {
      const { bytesWritten } = await file.write(
        bytes,
        offset,
        bytes.length - offset,
        action.offset + offset,
      )
      if (!bytesWritten) throw new Error('The import range could not be saved.')
      offset += bytesWritten
    }
    await file.sync()
  } finally {
    await file.close()
  }
  const next = Math.max(progress, action.offset + action.length)
  if (
    next === action.part.sizeBytes &&
    (await storage.hash(path)) !== action.part.sha256
  )
    throw new Error('The import part hash does not match.')
  await saveImportJson(progressPath, next)
}
