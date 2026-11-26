/**
 * The words of the Long runs section of the Overview: its title, its
 * columns, the empty list, the row without a cloud computer ID, and the
 * format of a run length. This module imports no fixture, so the app uses
 * it too.
 */

/** The title of the section, the column labels, and the empty list. */
export const longRunsWords = {
  title: 'Long runs',
  org: 'Org',
  owner: 'Owner',
  computer: 'Cloud computer',
  lastActivity: 'Last activity',
  runningFor: 'Running for',
  /**
   * The empty list says what the section shows. It does not say that
   * nothing runs: the builds also run on cloud computers, and a run
   * without a start time does not show.
   */
  empty: 'The workspaces with the longest runs show here.',
  /** What screen readers hear for the dash of a row without an ID. */
  noComputer: 'No cloud computer ID yet',
} as const

/** The spoken name of Copy beside a cloud computer ID. */
export function copyComputerLabel(id: string): string {
  return `Copy the cloud computer ID ${id}`
}

const second = 1_000
const minute = 60 * second
const hour = 60 * minute
const day = 24 * hour

/**
 * How long a cloud computer has run since its last start, in its two
 * largest units: 3d 4h, or 5h 12m. A run under an hour gives its minutes,
 * such as 48m, and a run under a minute its seconds, such as 41s. The
 * units follow the lengths of the chat, such as 1h 12m.
 */
export function formatRunLength(ms: number): string {
  const length = Math.max(0, ms)
  if (length < minute) return `${Math.floor(length / second)}s`
  if (length < hour) return `${Math.floor(length / minute)}m`
  if (length < day) {
    return `${Math.floor(length / hour)}h ${Math.floor((length % hour) / minute)}m`
  }
  return `${Math.floor(length / day)}d ${Math.floor((length % day) / hour)}h`
}
