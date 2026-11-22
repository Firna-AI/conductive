import {
  DEFAULT_IDLE_STOP_MINUTES,
  IDLE_STOP_CHOICES,
  isIdleStopMinutes,
  type IdleStopMinutes,
} from '../../src/shared/operator-idle-stop'

/** The SQL list of the valid choices. Each is a fixed number. */
const choices = IDLE_STOP_CHOICES.join(', ')

interface SettingRow {
  minutes: number
  updatedAt: number | null
  githubId: number | null
  login: string | null
}

export interface IdleStopSetting extends SettingRow {
  minutes: IdleStopMinutes
}

/**
 * The saved stop time with the time and the operator of its last change.
 * A missing row or a value that is not a choice reads as the default, so
 * that the tab still opens and a save repairs the row.
 */
export async function readIdleStopSetting(
  db: D1Database,
): Promise<IdleStopSetting> {
  const row = await db
    .prepare(
      `SELECT s.minutes AS minutes, s.updated_at AS updatedAt,
       u.github_id AS githubId, u.github_login AS login
       FROM idle_stop_settings s LEFT JOIN users u ON u.id = s.updated_by_user_id
       WHERE s.id = 1`,
    )
    .first<SettingRow>()
  if (row && isIdleStopMinutes(row.minutes))
    return { ...row, minutes: row.minutes }
  console.warn('The idle stop setting is not available. Using the default.')
  return {
    minutes: DEFAULT_IDLE_STOP_MINUTES,
    updatedAt: row?.updatedAt ?? null,
    githubId: row?.githubId ?? null,
    login: row?.login ?? null,
  }
}

/**
 * Writes the event and the new stop time only while the row still holds
 * the expected time. A missing row gets the new time too. The result says
 * whether the setting changed.
 */
export async function changeIdleStopSetting(
  db: D1Database,
  expected: number,
  minutes: IdleStopMinutes,
  operatorId: string,
  now: number,
): Promise<boolean> {
  const result = await db.batch([
    db
      .prepare(
        `INSERT INTO idle_stop_events (minutes, changed_at, operator_user_id)
         SELECT ?, ?, ? WHERE NOT EXISTS (
           SELECT 1 FROM idle_stop_settings
           WHERE id = 1 AND minutes != ? AND minutes IN (${choices})
         )`,
      )
      .bind(minutes, now, operatorId, expected),
    db
      .prepare(
        `INSERT INTO idle_stop_settings (id, minutes, updated_at, updated_by_user_id)
         VALUES (1, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET minutes = excluded.minutes,
           updated_at = excluded.updated_at,
           updated_by_user_id = excluded.updated_by_user_id
         WHERE idle_stop_settings.minutes = ?
           OR idle_stop_settings.minutes NOT IN (${choices})`,
      )
      .bind(minutes, now, operatorId, expected),
  ])
  return result[1].meta.changes === 1
}
