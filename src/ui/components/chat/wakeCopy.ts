/**
 * The words of the line of the app that wakes a session when a turn that it
 * watched ends. The chat shows them around the chip of the watched session.
 * The agent of the woken session and the copy of a transcript get the same
 * words, with the link of that session in place of the chip. The app, the
 * Worker, and the mockups take them from here, so the texts cannot drift
 * apart. The module draws nothing and reads no fixtures.
 */

import type { TurnEndReason } from '../../../shared/generated/TurnEndReason'
import type { SessionWatchEndState } from '../../../shared/generated/SessionWatchEndState'
import { endReasonText } from './endReasonCopy'

/**
 * The words of a wake: `lead` comes before the session, and each note
 * follows the session after a dot, such as the end reason of its turn.
 */
export interface WakeWords {
  lead: string
  notes: readonly string[]
}

/**
 * The words before the session. The end comes first, so it stays on the
 * first line when a narrow chat moves the chip to the next line.
 */
const leads: Readonly<Record<SessionWatchEndState, string>> = {
  finished: 'A turn finished in',
  failed: 'A turn failed in',
  stopped: 'A turn stopped in',
}

/**
 * The words of the wake of a watched turn that ended as `end`. `reason` is
 * the end reason that the end of that turn names, such as the time limit of
 * background work. The app writes the words of each end reason, so a raw
 * error never shows in the line.
 */
export function wakeWords(
  end: SessionWatchEndState,
  reason?: TurnEndReason,
): WakeWords {
  return {
    lead: leads[end],
    notes: reason === undefined ? [] : [endReasonText(reason)],
  }
}

/**
 * The words of a wake as one text, with `session` in place of the chip:
 * the session link of the watched session for the agent, as a `Sent by:`
 * line gives it, or that link in Markdown for the copy of a transcript. A
 * note follows after a dot, as in the chat.
 */
export function wakeText(words: WakeWords, session: string): string {
  return [`${words.lead} ${session}`, ...words.notes].join(' · ')
}
