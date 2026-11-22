import type { SessionWatchEndState } from '../../../../../../src/shared/generated/SessionWatchEndState'
import { turnEndReasons } from './chatKeys'

/** How a watched turn ended, as `SessionWatchEndState` lists them. */
const watchEnds = [
  'finished',
  'failed',
  'stopped',
] as const satisfies readonly SessionWatchEndState[]

/** The line of the app that wakes a session, as `WakeItem`. */
export const wakeItemSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'id', 'session', 'end'],
  properties: {
    kind: { const: 'wake' },
    id: { type: 'string', minLength: 1 },
    /** The session link of the watched session, which shows as its chip. */
    session: { type: 'string' },
    end: { enum: watchEnds },
    /** The end reason that the end of the watched turn names. */
    reason: { enum: turnEndReasons },
    /** The watched turn ended while a turn ran: it joins that turn. */
    during: { const: true },
  },
} as const
