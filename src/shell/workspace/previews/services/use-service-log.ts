import { useCallback, useEffect, useRef, useState } from 'react'
import type { ServiceLogResponse } from '../../../../shared/generated/ServiceLogResponse'
import type { ServiceTarget } from '../../../../shared/generated/ServiceTarget'
import type { ServicesStore } from '../../../../previews/services/servicesStore'
import type { ToolResult } from '../../../../terminal/tool-parts/request'

/**
 * What the log shows: the wait of a read, the end of the output with
 * whether it leaves earlier output out, no output yet, or a read that
 * failed, with the message of the server when it gave one.
 */
export type LogRead =
  | { kind: 'loading' }
  | { kind: 'lines'; text: string; omitted: boolean }
  | { kind: 'empty' }
  | { kind: 'failed'; message: string | null }

function logRead(result: ToolResult<ServiceLogResponse>): LogRead {
  if (!result.ok) return { kind: 'failed', message: result.error.message }
  const answer = result.value.result
  switch (answer.state) {
    case 'ready':
      return answer.text === ''
        ? { kind: 'empty' }
        : { kind: 'lines', text: answer.text, omitted: answer.omitted }
    case 'failed':
      return { kind: 'failed', message: answer.error.message }
    case 'stale':
    case 'not_found':
    case 'unavailable':
      return { kind: 'failed', message: null }
  }
}

/**
 * The reads of a log while its view shows: one at the open, and one at
 * each Reload, of the run that `target` gives at that moment. A new read,
 * a close, and a reload stop the read before it. A read of a run that is
 * no longer current reads the list again too.
 */
export function useServiceLog(
  store: ServicesStore,
  target: () => ServiceTarget,
): { read: LogRead; reload: () => void } {
  const [read, setRead] = useState<LogRead>({ kind: 'loading' })
  const running = useRef<AbortController | null>(null)
  const latest = useRef(target)
  useEffect(() => {
    latest.current = target
  })
  /** Starts a read in place of the one that runs. Its answer sets the view. */
  const start = useCallback(() => {
    running.current?.abort()
    const reading = new AbortController()
    running.current = reading
    void store.readLog(latest.current(), reading.signal).then((result) => {
      if (reading.signal.aborted) return
      if (result.ok && result.value.result.state === 'stale')
        void store.refresh()
      setRead(logRead(result))
    })
  }, [store])
  // The view opens with the wait of its first read.
  useEffect(() => {
    start()
    return () => running.current?.abort()
  }, [start])
  const reload = () => {
    setRead({ kind: 'loading' })
    start()
  }
  return { read, reload }
}
