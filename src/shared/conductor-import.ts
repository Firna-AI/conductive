export interface ConductorImportOrigin {
  localWorkspaceId: string
  importerUserId: string
  activatedAt: number | null
}

/** A native workspace has no import fields. */
export function readWorkspaceImport(value: unknown): {
  conductorImport?: ConductorImportOrigin
} {
  if (value === undefined) return {}
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error('The workspace import data is not valid.')
  if (
    !('localWorkspaceId' in value) ||
    typeof value.localWorkspaceId !== 'string' ||
    !('importerUserId' in value) ||
    typeof value.importerUserId !== 'string' ||
    !('activatedAt' in value) ||
    (value.activatedAt !== null &&
      (typeof value.activatedAt !== 'number' ||
        !Number.isSafeInteger(value.activatedAt) ||
        value.activatedAt < 0))
  )
    throw new Error('The workspace import data is not valid.')
  return {
    conductorImport: {
      localWorkspaceId: value.localWorkspaceId,
      importerUserId: value.importerUserId,
      activatedAt: value.activatedAt,
    },
  }
}
