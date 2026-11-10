export interface ImportStorageScope {
  readonly orgId: string
  readonly reservationId: string
}

export type ImportObjectGroup = 'work' | 'document'

export interface ImportPart {
  readonly group: ImportObjectGroup
  readonly id: string
  readonly sizeBytes: number
  /** Lowercase hexadecimal SHA-256 of the complete part. */
  readonly sha256: string
}

export interface ImportUploadIdentity {
  readonly scope: ImportStorageScope
  readonly part: ImportPart
  readonly uploadId: string
}

/** Send the exact bytes with these headers and no ambient credentials. */
export interface ImportUploadTarget {
  readonly method: 'PUT'
  readonly url: string
  readonly headers: Readonly<Record<string, string>>
  readonly expiresAt: number
  readonly identity: ImportUploadIdentity
}

export interface SealedImportPart {
  readonly scope: ImportStorageScope
  readonly part: ImportPart
}

export interface ImportByteRange {
  readonly offset: number
  readonly length: number
}

export class ImportStorageError extends Error {
  readonly code:
    | 'not_configured'
    | 'invalid_part'
    | 'scope_mismatch'
    | 'invalid_range'
    | 'part_missing'
    | 'part_mismatch'
    | 'read_cancelled'

  constructor(code: ImportStorageError['code']) {
    super(`Import storage: ${code}`)
    this.code = code
  }
}

/** Trusted server boundary. The caller owns access checks and durable records. */
export interface ConductorImportStorage {
  createUploadTarget(part: ImportPart): Promise<ImportUploadTarget>
  /** Missing or mismatched bytes return null. A successful seal is immutable. */
  sealPart(identity: ImportUploadIdentity): Promise<SealedImportPart | null>
  readPart(
    sealed: SealedImportPart,
    range: ImportByteRange,
    signal?: AbortSignal,
  ): Promise<Uint8Array<ArrayBuffer>>
  /** Parts must belong to old documents, in their stored byte order. */
  streamDocument(parts: Iterable<SealedImportPart>): ReadableStream<Uint8Array>
  /** Delete this reservation only. Omit group to delete both groups. */
  deleteObjects(group?: ImportObjectGroup): Promise<void>
}
