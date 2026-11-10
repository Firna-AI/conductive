import type {
  ConductorOldDocument,
  ConductorOldDocuments,
} from '../../src/shared/conductor-import.ts'
import { importPage } from '../../src/shared/conductor-import-pages.ts'
import {
  importInteger,
  importNullableText,
  importObject,
  importText,
  ImportContractError,
} from '../../src/shared/conductor-import-values.ts'
import type { ImportPart } from '../../src/shared/conductor-import-storage.ts'
import { readImportPart } from '../../src/shared/conductor-import-manifest-read.ts'

interface DocumentRow extends ConductorOldDocument {
  ordinal: number
  objectId: string
}

const columns = `d.id,d.ordinal,d.title,d.agent,d.message_count AS messageCount,
  d.occurred_at AS occurredAt,d.object_id AS objectId`

export function readOldDocument(
  db: D1Database,
  orgId: string,
  workspaceId: string,
  documentId: string,
) {
  return db
    .prepare(
      `SELECT ${columns} FROM conductor_import_documents d
    JOIN conductor_import_reservations r ON r.id = d.reservation_id AND r.state = 'complete'
    JOIN workspaces w ON w.id = r.id AND w.org_id = r.org_id
    WHERE w.org_id = ? AND w.id = ? AND d.id = ?`,
    )
    .bind(orgId, workspaceId, documentId)
    .first<DocumentRow>()
}

export async function oldDocumentPage(
  db: D1Database,
  orgId: string,
  workspaceId: string,
  offset: number,
): Promise<ConductorOldDocuments> {
  const rows = await db
    .prepare(
      `WITH candidates AS (SELECT ${columns} FROM conductor_import_documents d
    JOIN conductor_import_reservations r ON r.id = d.reservation_id AND r.state = 'complete'
    JOIN workspaces w ON w.id = r.id AND w.org_id = r.org_id
    WHERE w.org_id = ? AND w.id = ? AND d.ordinal >= ? ORDER BY d.ordinal LIMIT 64),
      sized AS (SELECT *,SUM(length(CAST(COALESCE(title,'') || id || objectId AS BLOB)) + 128)
        OVER (ORDER BY ordinal) AS bytes FROM candidates)
      SELECT * FROM sized WHERE bytes <= 125000 OR ordinal = (SELECT MIN(ordinal) FROM candidates) ORDER BY ordinal`,
    )
    .bind(orgId, workspaceId, offset)
    .all<DocumentRow>()
  const values = rows.results.map((row) => ({
    row,
    document: readDocumentMetadata(row),
  }))
  const page = importPage(values, (values) => ({
    documents: values.map((item) => item.document),
    nextCursor: 0,
  }))
  const next = page.length ? page[page.length - 1].row.ordinal + 1 : offset
  const hasMore = await db
    .prepare(
      `SELECT 1 FROM conductor_import_documents
    WHERE reservation_id = ? AND ordinal >= ? LIMIT 1`,
    )
    .bind(workspaceId, next)
    .first()
  return {
    documents: page.map((item) => item.document),
    nextCursor: hasMore ? next : null,
  }
}

function readDocumentMetadata(value: unknown): ConductorOldDocument {
  const row = importObject(value)
  if (row.agent !== 'claude' && row.agent !== 'codex')
    throw new ImportContractError()
  return {
    id: importText(row.id),
    title: importNullableText(row.title),
    agent: row.agent,
    messageCount: importInteger(row.messageCount),
    occurredAt: row.occurredAt === null ? null : importInteger(row.occurredAt),
  }
}

export async function nextDocumentPart(
  db: D1Database,
  id: string,
  objectId: string,
  index: number,
): Promise<{ index: number; part: ImportPart } | null> {
  const row = await db
    .prepare(
      `SELECT part_index AS partIndex,id,group_name AS 'group',
    size_bytes AS sizeBytes,sha256 FROM conductor_import_parts
    WHERE reservation_id = ? AND object_id = ? AND part_index >= ? AND verified = 1
    ORDER BY part_index LIMIT 1`,
    )
    .bind(id, objectId, index)
    .first<{ partIndex: number } & ImportPart>()
  return row ? { index: row.partIndex, part: readImportPart(row) } : null
}
