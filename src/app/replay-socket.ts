import { count, ParseError, record } from './api/parse'
import { reconnectWait, type Delay, type WorkspaceEventSource } from './events'
import type { WorkspaceIdentity } from './workspace-store'

/**
 * A subscription to the event stream of one workspace, for a store that
 * reads each raw socket message itself. The first message holds the stored
 * history after `afterEventNumber`. Live events follow. The result ends it.
 */
export type RawSubscribe = (
  afterEventNumber: number,
  listener: (message: unknown) => void,
) => () => void

/**
 * Where a socket message ends. `eventNumber` is the number that a new
 * connection can start after without a loss.
 */
interface MessageEnd {
  /** A page of the stored history, not a live event. */
  history: boolean
  /** More pages of the same replay follow this page. */
  more: boolean
  eventNumber: number
}

function endOf(message: unknown): MessageEnd | null {
  try {
    const value = record(message, 'socket message')
    if (value.type === 'history') {
      const history = record(value.history, 'history')
      const through = count(history, 'throughEventNumber')
      if (history.hasMore !== true) {
        return { history: true, more: false, eventNumber: through }
      }
      // The pages share the cutoff, so the state is complete only through
      // the start of the next page.
      const next = count(history, 'nextAfterEventNumber')
      return { history: true, more: true, eventNumber: Math.min(next, through) }
    }
    if (value.type === 'event') {
      const envelope = record(value.envelope, 'envelope')
      const eventNumber = count(envelope, 'eventNumber')
      return { history: false, more: false, eventNumber }
    }
  } catch (error) {
    if (!(error instanceof ParseError)) throw error
  }
  return null
}

/**
 * The event stream of one workspace over the event source of the app. Each
 * subscription opens the source after its event number. When the connection
 * drops, it opens again after the newest event that it delivered, after the
 * wait of `reconnectWait`. The stored history can come in pages that share
 * one cutoff. While more pages come, a new connection starts after the start
 * of the next page, and a live event moves nothing, because it waits in the
 * store for the final page. So no event gets lost, and the store still reads
 * each message from `unknown`.
 */
export function replaySubscribe(
  source: WorkspaceEventSource,
  workspace: WorkspaceIdentity,
  delay: Delay,
): RawSubscribe {
  return (afterEventNumber, listener) => {
    let cursor = afterEventNumber
    let replaying = false
    let failures = 0
    let ended = false
    let close: (() => void) | null = null
    let cancelWait: (() => void) | null = null
    const open = () => {
      close = source.open(
        { ...workspace, afterEventNumber: cursor },
        {
          message: (value) => {
            const end = endOf(value)
            if (end?.history) {
              // A history means that the connection works again.
              failures = 0
              replaying = end.more
            }
            const counts = end !== null && (end.history || !replaying)
            if (counts && end.eventNumber > cursor) cursor = end.eventNumber
            listener(value)
          },
          closed: () => {
            close = null
            if (ended) return
            const wait = reconnectWait(failures)
            failures += 1
            cancelWait = delay(wait, () => {
              cancelWait = null
              if (!ended) open()
            })
          },
        },
      )
    }
    open()
    return () => {
      ended = true
      cancelWait?.()
      cancelWait = null
      close?.()
      close = null
    }
  }
}
