import type { TerminalEnd } from '../shared/terminal'

/**
 * A connection that stays open this long after its first output works.
 * When an automatic try ends sooner, the try failed.
 */
const WORKING_CONNECTION_MS = 60_000

/**
 * Whether an ended connection connects again by itself. A lost connection
 * connects again once. A close of the server, such as at the end of the
 * shell, and a failed automatic try show Disconnected with Reconnect.
 * `automatic` says that the ended connection was itself the automatic try.
 */
export function retries(
  automatic: boolean,
  ended: { end: TerminalEnd; lasted: number },
): boolean {
  if (ended.end !== 'lost') return false
  return !automatic || ended.lasted >= WORKING_CONNECTION_MS
}
