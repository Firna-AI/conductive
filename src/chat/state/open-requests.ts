import { requestsOf } from '../device/device-snapshot'
import { waitsForAnswer } from '../secrets/secret-open'
import type { ChatSnapshot } from './chat-snapshot'

/**
 * A request of the agent of the session waits for a member: a Mac command
 * whose call waits, or an open secret request, whose call waits or that is
 * late. Each of them waits in the stack above the composer of the session.
 * The tab of the session then shows the needs-input mark, and so does the
 * mark of an explanation. A waiting Mac command counts in every view, also
 * in a view that cannot answer it. A secret request that settles counts
 * nowhere, as `waitsForAnswer` says, because the stack does not show it.
 */
export function waitsForMember(
  snapshot: ChatSnapshot,
  sessionId: string,
): boolean {
  const { secrets } = snapshot
  const commands = requestsOf(snapshot.devices, sessionId)
  if (commands.some((request) => request.state === 'waiting')) return true
  return Object.values(secrets.requests).some(
    ({ request }) =>
      request.sessionId === sessionId && waitsForAnswer(secrets, request),
  )
}
