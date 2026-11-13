import type { StreamEnvelope } from '../../../app/api/read-events'
import type { WorkspaceStream } from '../../../app/events'
import {
  readBannerResponse,
  readChecksResponse,
} from '../../../github/githubParse'
import type { SubscribeToWorkspace } from '../../../github/githubSource'
import type { WorkspaceSocketMessage } from '../../../shared/events'

/**
 * The live message of a GitHub event, checked with the readers of the
 * GitHub replies. Null for another event, and for one outside the
 * contract.
 */
function githubMessage(
  envelope: StreamEnvelope,
): WorkspaceSocketMessage | null {
  if (envelope.type !== 'github.updated') return null
  const banner = readBannerResponse({ banner: envelope.event.banner })
  const checks = readChecksResponse(envelope.event.checks)
  if (!banner || !checks) return null
  return {
    type: 'event',
    envelope: {
      workspaceId: envelope.workspaceId,
      eventNumber: envelope.eventNumber,
      occurredAt: envelope.occurredAt,
      event: { type: 'github.updated', banner: banner.banner, checks },
    },
  }
}

/**
 * The GitHub events of the ordered stream of the open workspace, as live
 * messages. The GitHub store reads the current state when it connects, so
 * it needs no stored history, and none comes. The stream drops repeated
 * events and the events of other workspaces, and opens again after a gap.
 */
export function githubSubscribe(stream: WorkspaceStream): SubscribeToWorkspace {
  return (_afterEventNumber, listener) =>
    stream.subscribe((envelope) => {
      const message = githubMessage(envelope)
      if (message) listener(message)
    })
}
