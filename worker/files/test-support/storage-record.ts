import type { BrowserChangesResponse } from '../../../src/shared/generated/BrowserChangesResponse'
import type { FileTreeResponse } from '../../../src/shared/generated/FileTreeResponse'
import { BUCKET_LAYOUT } from '../bucket-layout'
import { readFileList, readFilesManifest, type FilesStorage } from '../storage'

export interface StoredFiles {
  connectionId: string | null
  hasSnapshot: boolean
  tree: FileTreeResponse | null
  changes: BrowserChangesResponse | null
}

export async function readStoredFiles(
  storage: FilesStorage,
): Promise<StoredFiles> {
  const manifest = await readFilesManifest(storage)
  return {
    connectionId: manifest.connectionId,
    hasSnapshot: manifest.hasSnapshot,
    tree: await readFileList(storage, manifest, 'tree'),
    changes: await readFileList(storage, manifest, 'changes'),
  }
}

export async function readStoredTreeFields(storage: FilesStorage) {
  const manifest = await readFilesManifest(storage)
  return manifest.layout === BUCKET_LAYOUT ? manifest.tree?.fields : undefined
}

export function writeStorageRecord(
  storage: FilesStorage,
  updates: Readonly<Record<string, unknown>>,
  removals: readonly string[] = [],
): Promise<void> {
  return storage.transaction(async (transaction) => {
    for (const [key, value] of Object.entries(updates))
      await transaction.put(key, value)
    for (const key of removals) await transaction.delete(key)
  })
}
