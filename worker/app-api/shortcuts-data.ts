import { isShortcutCommandId } from '../../src/shared/shortcut-commands'
import {
  ShortcutContractError,
  type ShortcutKeyboard,
} from '../../src/shared/shortcut-key'
import { readSaveShortcutsResponse } from '../../src/shared/shortcut-read'
import type {
  SaveShortcutsRequest,
  SaveShortcutsResponse,
  ShortcutChange,
  ShortcutPreferences,
} from '../../src/shared/shortcuts'
import { warnWorker } from '../warnings'

interface ShortcutRow {
  keyboard: ShortcutKeyboard
  command: string
  keysJson: string
}

function shortcutsQuery(db: D1Database, userId: string) {
  return db
    .prepare(
      `SELECT keyboard, command, keys_json AS keysJson FROM user_shortcuts
       WHERE user_id = ? ORDER BY keyboard, command`,
    )
    .bind(userId)
}

function readRows(rows: readonly ShortcutRow[]): ShortcutPreferences {
  const preferences: Record<ShortcutKeyboard, ShortcutChange[]> = {
    mac: [],
    other: [],
  }
  for (const row of rows) {
    if (!isShortcutCommandId(row.command)) continue
    try {
      const keys: unknown = JSON.parse(row.keysJson)
      const { changes } = readSaveShortcutsResponse({
        keyboard: row.keyboard,
        changes: [{ command: row.command, keys }],
      })
      preferences[row.keyboard].push(...changes)
      if (Array.isArray(keys) && keys.length > (changes[0]?.keys.length ?? 0)) {
        warnWorker({ kind: 'shortcut_keys_skipped' })
      }
    } catch (error) {
      if (!(
        error instanceof SyntaxError || error instanceof ShortcutContractError
      ))
        throw error
      warnWorker({ kind: 'shortcut_change_skipped' })
    }
  }
  return preferences
}

export async function accountShortcuts(
  db: D1Database,
  userId: string,
): Promise<ShortcutPreferences> {
  const { results } = await shortcutsQuery(db, userId).all<ShortcutRow>()
  return readRows(results)
}

export async function saveAccountShortcuts(
  db: D1Database,
  userId: string,
  request: SaveShortcutsRequest,
): Promise<SaveShortcutsResponse> {
  const statements = request.changes.map((change) =>
    change.keys === null
      ? db
          .prepare(
            'DELETE FROM user_shortcuts WHERE user_id = ? AND keyboard = ? AND command = ?',
          )
          .bind(userId, request.keyboard, change.command)
      : db
          .prepare(
            `INSERT INTO user_shortcuts (user_id, keyboard, command, keys_json)
             VALUES (?, ?, ?, ?) ON CONFLICT(user_id, keyboard, command)
             DO UPDATE SET keys_json = excluded.keys_json`,
          )
          .bind(
            userId,
            request.keyboard,
            change.command,
            JSON.stringify(change.keys),
          ),
  )
  const results = await db.batch<ShortcutRow>([
    ...statements,
    shortcutsQuery(db, userId),
  ])
  const preferences = readRows(results[statements.length].results)
  return { keyboard: request.keyboard, changes: preferences[request.keyboard] }
}
