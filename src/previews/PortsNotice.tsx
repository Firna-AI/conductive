import { useEffect, useState } from 'react'
import { LostUpdateRow } from '../../docs/mockups/src/components/chat/LostUpdate'
import { formatAgo } from '../chat/state/format'

const halfMinute = 30_000

/**
 * The notice of a failed repair of the list of servers, under the port form:
 * the latest list is unavailable, with the time since the failure. It has no
 * Dismiss, as the notice of a file list has none. The age moves on while
 * the notice shows.
 */
export function PortsNotice(props: { at: number; now: () => number }) {
  const { now: clock } = props
  const [now, setNow] = useState(clock)
  useEffect(() => {
    const timer = setInterval(() => setNow(clock()), halfMinute)
    return () => clearInterval(timer)
  }, [clock])
  return (
    <LostUpdateRow
      repair={{ data: 'servers', ago: formatAgo(props.at, now) }}
    />
  )
}
