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
 * of the replay. A subscription to a seeded stream gets an empty history
 * at its current complete number. The store has its own reads for that
 * state.
 */
export function githubSubscribe(stream: WorkspaceStream): SubscribeToWorkspace {
  return (_afterEventNumber, listener) => {
    let newest: WorkspaceEventEnvelope | null = null
    let seededThrough = stream.seeded.get() ? stream.last.get() : null
    const stop = stream.subscribe(
      (envelope, replayed) => {
        const github = githubEnvelope(envelope)
        if (!github) return
        if (replayed) newest = github
        else listener({ type: 'event', envelope: github })
      },
      (through) => {
        const events = newest ? [newest] : []
        newest = null
        const alreadySent = seededThrough === through && events.length === 0
        seededThrough = null
        if (alreadySent) return
        listener({
          type: 'history',
          history: { events, throughEventNumber: through },
        })
      },
    )
    if (seededThrough !== null) {
      listener({
        type: 'history',
        history: { events: [], throughEventNumber: seededThrough },
      })
    }
    return stop
  }
}
