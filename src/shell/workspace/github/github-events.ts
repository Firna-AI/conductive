import type { StreamEnvelope } from '../../../app/api/read-events'
import type { WorkspaceStream } from '../../../app/events'
import {
  readBannerResponse,
  readChecksResponse,
} from '../../../github/githubParse'
import type { SubscribeToWorkspace } from '../../../github/githubSource'
import type { WorkspaceEventEnvelope } from '../../../shared/events'

/**
 * The envelope of a GitHub event, checked with the readers of the GitHub
 * replies. Null for another event, and for one outside the contract.
 */
function githubEnvelope(
  envelope: StreamEnvelope,
): WorkspaceEventEnvelope | null {
  if (envelope.type !== 'github.updated') return null
  const banner = readBannerResponse({ banner: envelope.event.banner })
  const checks = readChecksResponse(envelope.event.checks)
  if (!banner || !checks) return null
  return {
    workspaceId: envelope.workspaceId,
    eventNumber: envelope.eventNumber,
    occurredAt: envelope.occurredAt,
    event: { type: 'github.updated', banner: banner.banner, checks },
  }
}

/**
 * The GitHub events of the ordered stream of the open workspace. A new
 * event goes to the store as a live message. The stream also replays its
 * stored history when it opens, which can hold many old GitHub states. Only
 * the newest of them goes to the store, as one history message at the end
 * of the replay. So the bar never steps through the old states, and they
 * never cancel the store's read of the current state. The stream drops
 * repeated events and the events of other workspaces, and opens again
 * after a gap.
 */
export function githubSubscribe(stream: WorkspaceStream): SubscribeToWorkspace {
  return (_afterEventNumber, listener) => {
    let newest: WorkspaceEventEnvelope | null = null
    return stream.follow({
      event: (envelope, replayed) => {
        const github = githubEnvelope(envelope)
        if (!github) return
        if (replayed) newest = github
        else listener({ type: 'event', envelope: github })
      },
      replayEnded: (through) => {
        const events = newest ? [newest] : []
        newest = null
        listener({
          type: 'history',
          history: { events, throughEventNumber: through },
        })
      },
    })
  }
}
