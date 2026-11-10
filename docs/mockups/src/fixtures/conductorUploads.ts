/**
 * What the import leaves behind on Cal's Mac and in the bucket: the files
 * and the sessions that the first import left out, the rows after an
 * upload that stopped, and the disk check before an activation.
 */

import type { AgentKey } from './agents'
import {
  conductorRows,
  uploadProgress,
  type ConductorRow,
} from './conductorImport'
import { couponTotals } from './importedWorkspaces'

const megabyte = 1024 * 1024

/**
 * A changed or untracked file over 100 MiB that stayed on the Mac. GitHub
 * refuses such a file in a push, so the import leaves it out, and the
 * upload size of its row does not count it.
 */
type LeftOutFile = {
  /** The local ID of the row of its workspace. */
  row: string
  path: string
  bytes: number
}

/**
 * A session that did not import, because its memory file, the agent's own
 * file of the session, is no longer on the Mac. It has no source, so the
 * workspace gets no document for it.
 */
type MissingSession = {
  /** The local ID of the row of its workspace. */
  row: string
  title: string
  agent: AgentKey
}

/** What the result of an import names as not imported. */
export type ImportReport = {
  files: readonly LeftOutFile[]
  sessions: readonly MissingSession[]
}

/**
 * The report of the first import. Each file is over 100 MiB. Check webhook
 * signatures had two sessions in Conductor, and one of them lost its
 * memory file, so it imports with one session.
 */
export const importReport: ImportReport = {
  files: [
    {
      row: '4f1c2a7e',
      path: 'data/baskets-2026-10.csv',
      bytes: Math.round(412.6 * megabyte),
    },
    {
      row: '9b3e5d10',
      path: 'fixtures/webhook-replay.har',
      bytes: Math.round(156.3 * megabyte),
    },
  ],
  sessions: [
    { row: '9b3e5d10', title: 'Retry failed deliveries', agent: 'claude' },
  ],
}

/** The sessions of a row that imported, without the ones that lost their file. */
export function importedSessions(row: ConductorRow): number {
  const missing = importReport.sessions.filter((item) => item.row === row.id)
  return row.sessions - missing.length
}

/**
 * The last day of the reservation of the upload that stopped on 10 Nov,
 * 7 days later.
 */
const keptUntil = '17 Nov'

/**
 * The rows on a later visit, after the upload of the first import stopped
 * during Check webhook signatures. Coupon totals at checkout finished
 * first, so its workspace exists. Check webhook signatures is only an
 * unfinished reservation with the 2.1 MB that went up.
 */
export const rowsWithUnfinished: readonly ConductorRow[] = conductorRows.map(
  (row) => {
    if (row.id === '4f1c2a7e') return { ...row, imported: couponTotals }
    if (row.id === '9b3e5d10') {
      return {
        ...row,
        reservation: {
          kind: 'unfinished',
          stored: uploadProgress.sent,
          keptUntil,
        },
      }
    }
    return row
  },
)

/**
 * The same rows after the reservation expired. Its parts are gone, so the
 * row imports again in full, from the work that stays on the Mac.
 */
export const rowsWithExpired: readonly ConductorRow[] = rowsWithUnfinished.map(
  (row) =>
    row.reservation
      ? {
          ...row,
          reservation: {
            kind: 'expired',
            expiredOn: keptUntil,
          },
        }
      : row,
)

/**
 * The disk check before the activation of Coupon totals at checkout. Its
 * 18.4 MB package needs room to unpack, which makes the space it needs.
 * Here the cloud computer of Acme has less disk free than that.
 */
export const activationDisk = {
  needed: Math.round(41.3 * megabyte),
  free: Math.round(23.6 * megabyte),
} as const
