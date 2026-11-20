import {
  DEFAULT_IDLE_STOP_MINUTES,
  IDLE_STOP_CHOICES,
  isIdleStopMinutes,
  type IdleStopMinutes,
} from '../../src/shared/operator-idle-stop'

/** The time that the provider auto-stop adds to the stop time. */
const AUTO_STOP_MARGIN_SECONDS = 60
/** How long a workspace object keeps the stop time that it read. */
const IDLE_STOP_CACHE_MS = 60_000

/**
 * Reads the stop time that the operator saved. A missing row or a value
 * that is not a choice gives the default with a warning, so a bad row
 * never stops the lifecycle.
 */
async function readIdleStopMinutes(db: D1Database): Promise<IdleStopMinutes> {
  const row = await db
    .prepare('SELECT minutes FROM idle_stop_settings WHERE id = 1')
    .first<{ minutes: number }>()
  if (row && isIdleStopMinutes(row.minutes)) return row.minutes
  console.warn('The idle stop setting is not available. Using the default.')
  return DEFAULT_IDLE_STOP_MINUTES
}

/**
 * The provider auto-stop of a workspace computer, in seconds: the stop
 * time plus a margin, so that the provider never stops a computer before
 * the Worker's own stop. When the read fails, it uses the longest choice,
 * because a short backstop could stop a computer that should still run.
 */
export async function workspaceAutoStopSeconds(
  db: D1Database,
): Promise<number> {
  let minutes: number
  try {
    minutes = await readIdleStopMinutes(db)
  } catch (error) {
    console.warn('The idle stop setting did not load.', error)
    minutes = Math.max(...IDLE_STOP_CHOICES)
  }
  return minutes * 60 + AUTO_STOP_MARGIN_SECONDS
}

/**
 * The stop time of one workspace object in milliseconds. It keeps each
 * read for 60 seconds, because the object schedules its alarm often. A
 * failed read keeps the last value, or the default before the first read.
 */
export class IdleStopTime {
  private value: { ms: number; readAt: number } | null = null
  private readonly db: D1Database
  private readonly now: () => number

  constructor(db: D1Database, now: () => number) {
    this.db = db
    this.now = now
  }

  async ms(): Promise<number> {
    const now = this.now()
    if (this.value && now - this.value.readAt < IDLE_STOP_CACHE_MS)
      return this.value.ms
    try {
      const minutes = await readIdleStopMinutes(this.db)
      this.value = { ms: minutes * 60_000, readAt: now }
    } catch (error) {
      console.warn('The idle stop setting did not load.', error)
      if (!this.value) return DEFAULT_IDLE_STOP_MINUTES * 60_000
    }
    return this.value.ms
  }
}
