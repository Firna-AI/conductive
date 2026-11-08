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

/** Where a socket message ends: its newest event, and whether it is the history. */
interface MessageEnd {
  history: boolean
  eventNumber: number
}

function endOf(message: unknown): MessageEnd | null {
  try {
    const value = record(message, 'socket message')
    if (value.type === 'history') {
      const history = record(value.history, 'history')
      return {
        history: true,
        eventNumber: count(history, 'throughEventNumber'),
      }
    }
    if (value.type === 'event') {
      const envelope = record(value.envelope, 'envelope')
      return { history: false, eventNumber: count(envelope, 'eventNumber') }
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
 * wait of `reconnectWait`. So no event gets lost, and the store still reads
 * each message from `unknown`.
 */
export function replaySubscribe(
  source: WorkspaceEventSource,
  workspace: WorkspaceIdentity,
  delay: Delay,
): RawSubscribe {
  return (afterEventNumber, listener) => {
    let cursor = afterEventNumber
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
            if (end && end.eventNumber > cursor) cursor = end.eventNumber
            // A history means that the connection works again.
            if (end?.history) failures = 0
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
