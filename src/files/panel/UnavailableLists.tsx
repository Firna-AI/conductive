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

function Rows(props: { failed: FailedRepairs; now: () => number }) {
  const { failed, now: clock } = props
  const [now, setNow] = useState(clock)
  // The ages move on while the notices show.
  useEffect(() => {
    const timer = setInterval(() => setNow(clock()), minute / 2)
    return () => clearInterval(timer)
  }, [clock])
  return lists.map(([report, data]) => {
    const at = failed[report]
    if (at === undefined) return null
    return (
      <LostUpdateRow key={report} repair={{ data, ago: formatAgo(at, now) }} />
    )
  })
}

/**
 * The notices of the file lists whose fresh full report was lost too, under
 * the lists of the panel. Each names the list that is out of date and the
 * time since its repair failed.
 */
export function UnavailableLists(props: {
  failed: FailedRepairs
  now: () => number
}) {
  const { failed } = props
  if (lists.every(([report]) => failed[report] === undefined)) return null
  return <Rows failed={failed} now={props.now} />
}
