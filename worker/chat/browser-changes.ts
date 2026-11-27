import { BUCKET_LAYOUT } from '../files/bucket-layout'
import { InvalidFileResponse } from '../files/errors'
import {
  readFileList,
  readFilesManifest,
  type FilesReader,
} from '../files/storage'
import type { WorkspaceEventEnvelope } from './workspace-events'

export async function readCompleteChanges(
  files: FilesReader,
  envelope: WorkspaceEventEnvelope,
): Promise<WorkspaceEventEnvelope | null> {
  const event = envelope.event
  if (event.type !== 'changes.changed') return envelope
  const manifest = await readFilesManifest(files)
  if (
    manifest.layout !== BUCKET_LAYOUT ||
    manifest.changes?.fields.revision !== event.delta.revision
  )
    return null
  const changes = await readFileList(files, manifest, 'changes')
  return changes && { ...envelope, event: { type: 'changes.updated', changes } }
}

export function presentCompleteChanges(
  files: FilesReader,
  envelope: WorkspaceEventEnvelope,
): Promise<WorkspaceEventEnvelope | null> {
  return readCompleteChanges(files, envelope).catch((error: unknown) => {
    if (error instanceof InvalidFileResponse) return null
    throw error
  })
}
