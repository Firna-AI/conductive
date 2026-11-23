import type { DeviceCommandRecord } from '../../shared/generated/DeviceCommandRecord'
import type { ReactElement, ReactNode } from 'react'
import { CircleAlert } from 'lucide-react'

import { Notice } from '../../ui/components/common/Notice'
import type { TranscriptInsert } from '../../shared/transcript/transcript-entries'
import { KeptParts, sameData, sameElement } from '../components/same-data'
import type { ChatSnapshot, SessionState } from '../state/chat-snapshot'
import { ActionButton } from '../ui/actions'
import { CommandCard } from './CommandCard'
import { requestsOf } from './device-snapshot'
import { placeCommands } from '../../shared/transcript/command-placement'

/**
 * The card and the insert of each placed request, kept while they hold the
 * same data. So a change of the transcript, such as a streamed part, gives
 * the same insert for a card whose request and place did not change.
 */
const cards = new KeptParts<ReactElement<object>>(sameElement)
const placedCards = new KeptParts<TranscriptInsert<ReactNode>>(sameData)

/**
 * The Mac commands of the shown session. The requests that wait go just
 * above the composer. Each other request is a card at its place in its
 * turn, so a request that gets its answer stays in the chat. The requests
 * of other sessions never show here.
 */
export function sessionCommands(
  snapshot: ChatSnapshot,
  sessionId: string | null,
  state: SessionState,
): { waiting: DeviceCommandRecord[]; inserts: TranscriptInsert<ReactNode>[] } {
  const viewerId = snapshot.account?.user.id ?? null
  const requests = requestsOf(snapshot.devices, sessionId)
  const answered = requests.filter((request) => request.state !== 'waiting')
  const placed = placeCommands(state.transcript.items, state.times, answered)
  return {
    waiting: requests.filter((request) => request.state === 'waiting'),
    inserts: placed.map(({ request, after }) =>
      placedCards.keep(request, {
        key: `command:${request.requestId}`,
        after,
        content: cards.keep(
          request,
          <CommandCard request={request} viewerId={viewerId} />,
        ),
      }),
    ),
  }
}

/** The Mac commands did not load. The chat keeps what it showed before. */
export function DeviceLoadNotice(props: { onRetry: () => void }) {
  return (
    <Notice
      action={<ActionButton onPress={props.onRetry}>Try again</ActionButton>}
      icon={CircleAlert}
      title="Mac commands did not load"
      tone="danger"
    />
  )
}
