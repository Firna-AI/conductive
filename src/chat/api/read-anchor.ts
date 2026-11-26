import type { SessionAnchor } from '../../shared/generated/SessionAnchor'
import { isRecord } from './json'

/**
 * The anchor of an explanation, from the record of its session. An anchor
 * that is not readable gives null, so its session stays readable as a
 * session without a mark, as a session from before Explain is.
 */
export function readAnchor(value: unknown): SessionAnchor | null {
  if (!isRecord(value)) return null
  const { parentSessionId, messageId, quote, before, after } = value
  if (
    typeof parentSessionId !== 'string' ||
    typeof messageId !== 'string' ||
    typeof quote !== 'string' ||
    typeof before !== 'string' ||
    typeof after !== 'string'
  )
    return null
  return { parentSessionId, messageId, quote, before, after }
}
