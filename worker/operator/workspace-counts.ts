export const runningWorkspacePredicate = `w.archived_at IS NULL
  AND w.state IN ('starting', 'ready', 'working', 'unread', 'input')`

export const workspaceStateCounts = `
  COUNT(CASE WHEN ${runningWorkspacePredicate} THEN 1 END) AS running,
  COUNT(CASE WHEN w.archived_at IS NULL AND w.state = 'stopped' THEN 1 END) AS stopped,
  COUNT(CASE WHEN w.archived_at IS NULL AND w.state = 'error' THEN 1 END) AS failed,
  COUNT(CASE WHEN w.archived_at IS NOT NULL OR w.state = 'archived' THEN 1 END) AS archived`

const DAY = 24 * 60 * 60 * 1_000

/** A count of one UTC day, with the day as `YYYY-MM-DD`. */
export interface DailyCount {
  date: string
  count: number
}

/**
 * The windows of a read of counts: the start of the first of the 30 UTC
 * days through the read, and the start of the 7 times 24 hours before it.
 */
export function countWindows(readAt: number): {
  firstDay: number
  weekStart: number
} {
  const day = new Date(readAt)
  day.setUTCHours(0, 0, 0, 0)
  return { firstDay: day.getTime() - 29 * DAY, weekStart: readAt - 7 * DAY }
}

/**
 * The SQL of the UTC day of `created_at`, as `YYYY-MM-DD`. `table` names
 * the table or its alias when a join makes the column ambiguous.
 */
export function createdDay(table?: string): string {
  const column = table ? `${table}.created_at` : 'created_at'
  return `strftime('%Y-%m-%d', ${column} / 1000, 'unixepoch')`
}

/**
 * The 30 UTC days from `firstDay`, oldest first, each with its count from
 * `rows`. A day without a row counts zero.
 */
export function dailyCounts(
  rows: readonly object[],
  firstDay: number,
): DailyCount[] {
  const counts = new Map(
    rows.map((row) => {
      if (!('date' in row) || !('count' in row))
        throw new Error('Invalid daily count')
      return [String(row.date), Number(row.count)]
    }),
  )
  return Array.from({ length: 30 }, (_, index) => {
    const date = new Date(firstDay + index * DAY).toISOString().slice(0, 10)
    return { date, count: counts.get(date) ?? 0 }
  })
}
