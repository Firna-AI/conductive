import type { ImportManifestEntry } from '../../src/shared/conductor-import-manifest.ts'

const field = (path: string) => `json_extract(entry.value,'$.${path}')`
const kind = field('kind')

export function manifestStatements(
  db: D1Database,
  id: string,
  offset: number,
  entries: ImportManifestEntry[],
  guard: string,
  bindings: unknown[],
) {
  const json = JSON.stringify(entries)
  const page = 'FROM json_each(?) entry'
  return [
    db
      .prepare(
        `INSERT INTO conductor_import_manifest
      (reservation_id,ordinal,kind,record_key,path,json)
      SELECT ?,CAST(entry.key AS INTEGER)+?,${kind},
        CASE WHEN ${kind} = 'part' THEN ${field('part.id')}
          WHEN ${kind} = 'prerequisite' THEN ${field('oid')}
          WHEN ${field('path')} IS NOT NULL THEN ${field('path')} ELSE ${field('id')} END,
        ${field('path')},entry.value ${page} WHERE ${guard}`,
      )
      .bind(id, offset, json, ...bindings),
    db
      .prepare(
        `INSERT INTO conductor_import_objects
      (reservation_id,id,purpose,encoding,size_bytes,restored_bytes,part_count)
      SELECT ?,${field('id')},${field('purpose')},${field('encoding')},
        ${field('sizeBytes')},${field('restoredBytes')},${field('partCount')}
      ${page} WHERE ${kind} = 'object' AND ${guard}`,
      )
      .bind(id, json, ...bindings),
    db
      .prepare(
        `INSERT INTO conductor_import_parts
      (reservation_id,id,object_id,part_index,ordinal,group_name,size_bytes,sha256)
      SELECT ?,${field('part.id')},${field('objectId')},${field('index')},CAST(entry.key AS INTEGER)+?,
        ${field('part.group')},${field('part.sizeBytes')},${field('part.sha256')}
      ${page} WHERE ${kind} = 'part' AND ${guard}`,
      )
      .bind(id, offset, json, ...bindings),
    db
      .prepare(
        `INSERT INTO conductor_import_documents
      (reservation_id,id,ordinal,title,agent,message_count,occurred_at,object_id,memory_object_id)
      SELECT ?,${field('id')},CAST(entry.key AS INTEGER)+?,${field('title')},${field('agent')},
        ${field('messageCount')},${field('occurredAt')},${field('documentObjectId')},${field('memoryObjectId')}
      ${page} WHERE ${kind} = 'session' AND ${guard}`,
      )
      .bind(id, offset, json, ...bindings),
  ]
}
