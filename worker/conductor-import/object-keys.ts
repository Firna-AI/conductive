import {
  ImportStorageError,
  type ImportObjectGroup,
  type ImportPart,
  type ImportStorageScope,
  type ImportUploadIdentity,
} from '../../src/shared/conductor-import-storage'

// The leading letter prevents URL dot-segment normalization for IDs such as '..'.
const segment = (value: string) => `i${encodeURIComponent(value)}`

export function importPrefix(
  scope: ImportStorageScope,
  group?: ImportObjectGroup,
): string {
  return `conductor-import/v1/${segment(scope.orgId)}/${segment(scope.reservationId)}/${group ? `${group}/` : ''}`
}

export function uploadKey(identity: ImportUploadIdentity): string {
  return `${importPrefix(identity.scope, identity.part.group)}uploads/${segment(identity.part.id)}/${segment(identity.uploadId)}`
}

export function sealedKey(scope: ImportStorageScope, part: ImportPart): string {
  return `${importPrefix(scope, part.group)}sealed/${segment(part.id)}/${part.sizeBytes}-${part.sha256}`
}

export function checkedPart(
  part: ImportPart,
  maxPartBytes: number,
): ImportPart {
  if (
    !['work', 'document'].includes(part.group) ||
    !Number.isSafeInteger(part.sizeBytes) ||
    part.sizeBytes < 0 ||
    part.sizeBytes > maxPartBytes ||
    !/^[a-f0-9]{64}$/.test(part.sha256)
  )
    throw new ImportStorageError('invalid_part')
  return { ...part }
}

export function checkScope(
  expected: ImportStorageScope,
  actual: ImportStorageScope,
): void {
  if (
    expected.orgId !== actual.orgId ||
    expected.reservationId !== actual.reservationId
  )
    throw new ImportStorageError('scope_mismatch')
}
