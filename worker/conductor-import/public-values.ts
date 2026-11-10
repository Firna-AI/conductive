import type {
  ImportPublicReservation,
  ImportReservation,
} from '../../src/shared/conductor-import-operation.ts'

export function publicImportReservation(
  value: ImportReservation,
): ImportPublicReservation {
  return {
    id: value.id,
    localWorkspaceId: value.localWorkspaceId,
    createdAt: value.createdAt,
    expiresAt: value.expiresAt,
    storedBytes: value.storedBytes,
    workspaceId: value.workspaceId,
  }
}
