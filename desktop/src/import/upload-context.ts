import type {
  ImportAction,
  ImportControlResult,
} from '../../../src/shared/conductor-import-operation.ts'
import type { ImportChannel } from './channel.ts'
import type { ImportJobs } from './types.ts'
import { LocalImportError } from './types.ts'
import type { ImportPut } from './upload.ts'

export interface ImportUploadDependencies {
  jobs: ImportJobs
  channel: ImportChannel
  signal: AbortSignal
  scope: string
  orgId: string
  operationId: string
  put: ImportPut
  now(): number
}
export type UploadAction = Extract<ImportAction, { localWorkspaceId: string }>
export function requireKind(
  result: ImportControlResult,
  kind: 'reservation',
): Extract<ImportControlResult, { kind: 'reservation' }>
export function requireKind(
  result: ImportControlResult,
  kind: 'repository.facts',
): Extract<ImportControlResult, { kind: 'repository.facts' }>
export function requireKind(
  result: ImportControlResult,
  kind: 'repository.prerequisites',
): Extract<ImportControlResult, { kind: 'repository.prerequisites' }>
export function requireKind(
  result: ImportControlResult,
  kind: 'target',
): Extract<ImportControlResult, { kind: 'target' }>
export function requireKind(
  result: ImportControlResult,
  kind: 'verified',
): Extract<ImportControlResult, { kind: 'verified' }>
export function requireKind(
  result: ImportControlResult,
  kind: 'complete',
): Extract<ImportControlResult, { kind: 'complete' }>
export function requireKind(
  result: ImportControlResult,
  kind: 'missing',
): Extract<ImportControlResult, { kind: 'missing' }>
export function requireKind(
  result: ImportControlResult,
  kind: ImportControlResult['kind'],
): ImportControlResult {
  if (result.kind !== kind) throw new LocalImportError('upload_failed')
  return result
}
