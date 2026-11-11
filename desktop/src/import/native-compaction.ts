import type { DatabaseSync } from 'node:sqlite'
import { setImmediate } from 'node:timers/promises'
import { nativeRecord } from './native-messages.ts'

export const claudeCompactions = (database: DatabaseSync) => {
  database.exec(`CREATE TABLE compactions (ordinal INTEGER PRIMARY KEY, anchor TEXT,
      head TEXT, tail TEXT, ordered INTEGER);
    CREATE TABLE preserved (ordinal INTEGER, sequence INTEGER, id TEXT);
    CREATE INDEX preserved_order ON preserved(ordinal, sequence);`)
  const insert = database.prepare(
    'INSERT INTO compactions VALUES (?, ?, ?, ?, ?)',
  )
  const preserve = database.prepare('INSERT INTO preserved VALUES (?, ?, ?)')
  const record = (row: Record<string, unknown>, ordinal: number) => {
    if (row.type !== 'system' || row.subtype !== 'compact_boundary') return
    const metadata = nativeRecord(row.compactMetadata)
    const messages = nativeRecord(metadata?.preservedMessages)
    if (messages) {
      const ids: unknown = messages.uuids
      if (
        typeof messages.anchorUuid !== 'string' ||
        !Array.isArray(ids) ||
        ids.length === 0 ||
        !ids.every((id: unknown): id is string => typeof id === 'string')
      )
        return
      insert.run(ordinal, messages.anchorUuid, ids[0], ids.at(-1) ?? null, 1)
      for (let sequence = 0; sequence < ids.length; sequence += 1) {
        preserve.run(ordinal, sequence, ids[sequence])
      }
      return
    }
    const segment = nativeRecord(metadata?.preservedSegment)
    if (
      segment &&
      typeof segment.anchorUuid === 'string' &&
      typeof segment.headUuid === 'string' &&
      typeof segment.tailUuid === 'string'
    )
      insert.run(
        ordinal,
        segment.anchorUuid,
        segment.headUuid,
        segment.tailUuid,
        0,
      )
  }
  const apply = async (signal: AbortSignal) => {
    const compactions = database.prepare(
      'SELECT * FROM compactions ORDER BY ordinal',
    )
    const ids = database.prepare(
      'SELECT id FROM preserved WHERE ordinal = ? ORDER BY sequence',
    )
    const missing =
      database.prepare(`SELECT 1 FROM preserved LEFT JOIN nodes ON nodes.id = preserved.id
      WHERE preserved.ordinal = ? AND nodes.id IS NULL LIMIT 1`)
    const reparent = database.prepare(
      'UPDATE nodes SET parent = ? WHERE id = ?',
    )
    const attach = database.prepare(
      'UPDATE nodes SET parent = ? WHERE parent = ? AND id <> ?',
    )
    let count = 0
    for (const rewrite of compactions.iterate()) {
      signal.throwIfAborted()
      if (
        typeof rewrite.anchor !== 'string' ||
        typeof rewrite.head !== 'string' ||
        typeof rewrite.tail !== 'string'
      )
        continue
      if (rewrite.ordered === 1) {
        if (missing.get(rewrite.ordinal)) continue
        let parent = rewrite.anchor
        for (const row of ids.iterate(rewrite.ordinal)) {
          signal.throwIfAborted()
          if (typeof row.id !== 'string') continue
          reparent.run(parent, row.id)
          parent = row.id
          count += 1
          if (count % 512 === 0) await setImmediate(undefined, { signal })
        }
      } else {
        reparent.run(rewrite.anchor, rewrite.head)
      }
      attach.run(rewrite.tail, rewrite.anchor, rewrite.head)
      count += 1
      if (count % 512 === 0) await setImmediate(undefined, { signal })
    }
  }
  return { record, apply }
}
