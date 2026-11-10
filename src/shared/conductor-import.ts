export interface ConductorImportOrigin {
  localWorkspaceId: string
  importerUserId: string
  activatedAt: number | null
}

export interface ConductorOldDocument {
  id: string
  title: string | null
  agent: 'claude' | 'codex'
  messageCount: number
  occurredAt: number | null
}

export interface ConductorOldDocuments {
  documents: ConductorOldDocument[]
  nextCursor: number | null
}

export const conductorImportOperationsPath = (orgId: string) =>
  `/api/orgs/${encodeURIComponent(orgId)}/conductor-import/operations`
export const conductorOldDocumentsPath = (orgId: string, workspaceId: string) =>
  `/api/orgs/${encodeURIComponent(orgId)}/workspaces/${encodeURIComponent(workspaceId)}/conductor-documents`
export const conductorOldDocumentPath = (
  orgId: string,
  workspaceId: string,
  documentId: string,
) =>
  `${conductorOldDocumentsPath(orgId, workspaceId)}/i${encodeURIComponent(documentId)}`

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
