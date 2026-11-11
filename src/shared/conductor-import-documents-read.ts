import type {
  ConductorOldDocument,
  ConductorOldDocuments,
} from './conductor-import.ts'
import {
  ImportContractError,
  importInteger,
  importList,
  importNullableText,
  importObject,
  importText,
} from './conductor-import-values.ts'

/** @public Browser callers read only old-document metadata through this parser. */
export function readConductorOldDocuments(
  value: unknown,
): ConductorOldDocuments {
  const row = importObject(value)
  return {
    documents: importList(row.documents).map((value): ConductorOldDocument => {
      const document = importObject(value)
      if (document.agent !== 'claude' && document.agent !== 'codex')
        throw new ImportContractError()
      return {
        id: importText(document.id),
        title: importNullableText(document.title),
        agent: document.agent,
        messageCount: importInteger(document.messageCount),
        occurredAt:
          document.occurredAt === null
            ? null
            : importInteger(document.occurredAt),
      }
    }),
    nextCursor: row.nextCursor === null ? null : importInteger(row.nextCursor),
  }
}
