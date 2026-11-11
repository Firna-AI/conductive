export interface ImportSessionMetadata {
  documentId: string
  /** Prepared memory does not certify provider acceptance. */
  preparation: 'prepared' | 'fallback'
}

export function readImportSessionMetadata(
  value: unknown,
): ImportSessionMetadata {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('documentId' in value) ||
    typeof value.documentId !== 'string' ||
    !value.documentId ||
    !('preparation' in value) ||
    (value.preparation !== 'prepared' && value.preparation !== 'fallback')
  )
    throw new Error('Invalid imported session metadata.')
  return { documentId: value.documentId, preparation: value.preparation }
}
