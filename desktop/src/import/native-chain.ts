import { mkdtemp, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { setImmediate } from 'node:timers/promises'
import { claudeCompactions } from './native-compaction.ts'
import { readNativeLines } from './native-lines.ts'
import { nativeRecord } from './native-messages.ts'

export const selectClaudeChain = async (
  path: string,
  outputPath: string,
  encoding: 'identity' | 'zstd',
  signal: AbortSignal,
) => {
  const directory = await mkdtemp(join(dirname(outputPath), '.native-chain-'))
  let database: DatabaseSync | undefined
  try {
    database = new DatabaseSync(join(directory, 'chain.sqlite'))
    database.exec(`PRAGMA journal_mode=OFF; PRAGMA synchronous=OFF;
      CREATE TABLE nodes (id TEXT PRIMARY KEY, parent TEXT, ordinal INTEGER,
        messageId TEXT, agentId TEXT, chosen INTEGER DEFAULT 0);
      CREATE INDEX nodes_ordinal ON nodes(ordinal);
      CREATE INDEX nodes_parent ON nodes(parent);
      CREATE INDEX nodes_message ON nodes(messageId, agentId);`)
    const compactions = claudeCompactions(database)
    const insert =
      database.prepare(`INSERT INTO nodes (id, parent, ordinal, messageId, agentId) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET parent=excluded.parent, ordinal=excluded.ordinal,
        messageId=excluded.messageId, agentId=excluded.agentId`)
    let leaf: string | null = null
    database.exec('BEGIN')
    await readNativeLines(path, encoding, signal, (value, ordinal) => {
      const row = nativeRecord(value)
      if (
        !row ||
        row.isSidechain === true ||
        row.teamName ||
        typeof row.uuid !== 'string'
      )
        return
      const parent = typeof row.parentUuid === 'string' ? row.parentUuid : null
      const message = nativeRecord(row.message)
      const messageId =
        row.type === 'assistant' && typeof message?.id === 'string'
          ? message.id
          : null
      const agentId = typeof row.agentId === 'string' ? row.agentId : null
      insert.run(row.uuid, parent, ordinal, messageId, agentId)
      compactions.record(row, ordinal)
      if (row.type === 'user' || row.type === 'assistant') leaf = row.uuid
    })
    database.exec('COMMIT')
    await compactions.apply(signal)
    const find = database.prepare('SELECT parent FROM nodes WHERE id = ?')
    const choose = database.prepare(
      'UPDATE nodes SET chosen = 1 WHERE id = ? AND chosen = 0',
    )
    let count = 0
    while (leaf !== null) {
      signal.throwIfAborted()
      if (choose.run(leaf).changes === 0) break
      const parent: unknown = find.get(leaf)?.parent
      leaf = typeof parent === 'string' ? parent : null
      count += 1
      if (count % 512 === 0) await setImmediate(undefined, { signal })
    }
    database.exec(`UPDATE nodes AS sibling SET chosen = 1
      WHERE sibling.messageId IS NOT NULL AND EXISTS (
        SELECT 1 FROM nodes AS selected WHERE selected.chosen = 1
          AND selected.messageId = sibling.messageId
          AND selected.agentId IS sibling.agentId)`)
    const includes = database.prepare(
      'SELECT 1 FROM nodes WHERE ordinal = ? AND chosen = 1',
    )
    const selectedDatabase = database
    return {
      includes: (ordinal: number) => includes.get(ordinal) !== undefined,
      dispose: async () => {
        selectedDatabase.close()
        await rm(directory, { recursive: true, force: true })
      },
    }
  } catch (error) {
    database?.close()
    await rm(directory, { recursive: true, force: true })
    throw error
  }
}
