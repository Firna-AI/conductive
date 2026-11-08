import { useEffect, useState } from 'react'
import { LostUpdateRow } from '../../../docs/mockups/src/components/chat/LostUpdate'
import type { UnavailableData } from '../../../docs/mockups/src/components/chat/lostCopy'
import { formatAgo } from '../../chat/state/format'
import type { FileReportKind } from '../api/parse-events'
import type { FailedRepairs } from '../model/failed-repairs'

const minute = 60_000

/** The lists in the order of their tabs, with the words of their notice. */
const lists: readonly (readonly [FileReportKind, UnavailableData])[] = [
  ['files.snapshot', 'all-files'],
  ['changes.updated', 'changes'],
]

interface ListsProps {
  failed: FailedRepairs
  /** All files shows the saved tree, because the files could not be read. */
  savedTree: boolean
  now: () => number
}

function Rows(props: ListsProps) {
  const { failed, now: clock } = props
  const [now, setNow] = useState(clock)
  const aged = lists.some(([report]) => failed[report] !== undefined)
  // The ages move on while the notices show.
  useEffect(() => {
    if (!aged) return
    const timer = setInterval(() => setNow(clock()), minute / 2)
    return () => clearInterval(timer)
  }, [aged, clock])
  return lists.map(([report, data]) => {
    const at = failed[report]
    if (at !== undefined) {
      return (
        <LostUpdateRow
          key={report}
          repair={{ data, ago: formatAgo(at, now) }}
        />
      )
    }
    // A failed read has no time that the browser knows.
    if (report === 'files.snapshot' && props.savedTree) {
      return <LostUpdateRow key={report} repair={{ data }} />
    }
    return null
  })
}

/**
 * The notices of the file lists that are not the latest ones, under the
 * lists of the panel, in the order of the tabs. A list whose fresh full
 * report was lost too shows the time since its repair failed. The saved tree
 * of a failed read of the files shows the same notice of All files, with no
 * time. One list shows one notice.
 */
export function UnavailableLists(props: ListsProps) {
  const { failed } = props
  const none = lists.every(([report]) => failed[report] === undefined)
  if (none && !props.savedTree) return null
  return <Rows {...props} />
}
