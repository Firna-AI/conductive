import type { ReactElement, ReactNode } from 'react'
import type {
  AnswerSecretRequest,
  SecretRequest,
} from '../../shared/secret-requests'
import { placeCommands } from '../../shared/transcript/command-placement'
import type { TranscriptInsert } from '../../shared/transcript/transcript-entries'
import type { WaitingItem } from '../components/request-stack'
import { KeptParts, sameData, sameElement } from '../components/same-data'
import type { ChatSnapshot, SessionState } from '../state/chat-snapshot'
import { loginReader } from '../state/session-login'
import { LateAnswerLine } from './LateAnswerLine'
import { isOpen, waitsForAnswer } from './secret-open'
import { keptLoginOwner, lateAnswerParts } from './secret-words'
import { SecretRequestCard } from './SecretRequestCard'
import { SecretRunCard } from './SecretRunCard'
import { waitingSecrets } from './waiting-secrets'
import { agentNames } from '../../shell/account/labels'

/** A secret record of the chat, before its place is known. */
interface SecretRecord {
  id: string
  turnId: string
  createdAt: number
  number: number
  unfolded: boolean
  node: ReactElement<object>
}

/**
 * The card of each request, run, and late answer, kept for its record while
 * it holds the same data, and the insert of each card. So a change of the
 * transcript, such as a streamed part, gives the same insert for a card
 * whose record and place did not change.
 */
const cards = new KeptParts<ReactElement<object>>(sameElement)
const placedCards = new KeptParts<TranscriptInsert<ReactNode>>(sameData)

/**
 * The records that take their places now. While the history of the session
 * loads, or after an earlier page of it failed, a record waits for a row of
 * its own turn, because `placeCommands` puts a record whose turn has no row
 * after the last row, which can belong to a newer turn.
 */
function placeable(
  records: readonly SecretRecord[],
  state: SessionState,
): readonly SecretRecord[] {
  if (state.hydration === 'ready') return records
  const turns = new Set(
    state.transcript.items.flatMap((item) =>
      'turnId' in item ? [item.turnId] : [],
    ),
  )
  return records.filter((record) => turns.has(record.turnId))
}

/**
 * The secret requests, runs, and late answers of the shown session, as the
 * events of the workspace give them. Each request shows in one place. Each
 * open request, whose tool call waits or that is late, waits in the stack
 * just above the composer, as `waiting` gives it, unless it settles, as
 * `waitsForAnswer` says: then it shows nowhere until its own event or a
 * read. Each other request is a card at its place in its turn, or nowhere
 * until a row of its turn loads, as `placeable` says. A request that became
 * late never folds with the work of its turn. A request that a member
 * allowed in time shows once, as its run. A request that a member denied in
 * time shows as a denied run. Each run folds with its turn, and the line of
 * a late answer stays in view. The order follows the copy of the session:
 * the time of each record, then its first event. `choices` says that the
 * chat takes answers. `onDeny` denies each request of a card that hides
 * older requests for the same secrets.
 */
export function sessionSecrets(
  snapshot: ChatSnapshot,
  sessionId: string | null,
  state: SessionState,
  props: {
    choices: boolean
    onAnswer: (requestId: string, answer: AnswerSecretRequest) => void
    onDeny: (requestIds: readonly string[]) => void
  },
): { waiting: WaitingItem[]; inserts: TranscriptInsert<ReactNode>[] } {
  const { requests, runs, notices, answers } = snapshot.secrets
  const viewerId = snapshot.account?.user.id ?? null
  const org = snapshot.org?.name ?? 'This org'
  const session = [...snapshot.sessions, ...snapshot.history].find(
    (item) => item.id === sessionId,
  )
  // The org as the session-login view names it, with the name of the cards
  // when the chat does not know that name.
  const orgName = loginReader(snapshot)?.orgName ?? org
  const login = session
    ? {
        owner: keptLoginOwner(session, viewerId, orgName),
        agent: agentNames[session.choice.agent],
      }
    : null
  const card = (request: SecretRequest) =>
    cards.keep(
      request,
      <SecretRequestCard
        answering={null}
        choices={props.choices}
        key={`${request.id}:ended`}
        login={login}
        onAnswer={props.onAnswer}
        org={org}
        request={request}
        viewerId={viewerId}
      />,
    )
  const own = Object.values(requests).filter(
    ({ request }) => request.sessionId === sessionId,
  )
  const waiting = waitingSecrets(
    own.filter(({ request }) => waitsForAnswer(snapshot.secrets, request)),
    { viewerId, org, login, answers, ...props },
  )
  const records: SecretRecord[] = [
    ...own
      .filter(({ request }) => !isOpen(request) && !runs[request.id])
      .map(({ request, firstNumber }) => ({
        id: request.id,
        turnId: request.turnId,
        createdAt: request.createdAt,
        number: firstNumber ?? Number.MAX_SAFE_INTEGER,
        unfolded: request.late,
        node:
          request.state === 'denied' && !request.late
            ? cards.keep(
                request,
                <SecretRunCard
                  item={{ kind: 'denied', request }}
                  viewerId={viewerId}
                />,
              )
            : card(request),
      })),
    ...Object.values(runs)
      .filter(({ event }) => event.sessionId === sessionId)
      .map(({ event, number, occurredAt }) => ({
        id: event.id,
        turnId: event.turnId,
        createdAt: occurredAt,
        number,
        unfolded: false,
        node: cards.keep(
          event,
          <SecretRunCard
            item={{
              kind: 'run',
              run: event,
              request: requests[event.id]?.request ?? null,
            }}
            viewerId={viewerId}
          />,
        ),
      })),
    ...Object.values(notices)
      .filter(({ event }) => event.sessionId === sessionId)
      .map(({ event, number, occurredAt }) => {
        const answered = requests[event.requestId]?.request
        return {
          id: `notice:${event.requestId}`,
          turnId: event.turnId,
          createdAt: occurredAt,
          number,
          unfolded: true,
          node: cards.keep(
            event,
            <LateAnswerLine
              parts={answered ? lateAnswerParts(answered, viewerId, org) : null}
              text={event.text}
            />,
          ),
        }
      }),
  ].sort((a, b) => a.createdAt - b.createdAt || a.number - b.number)
  const placed = placeCommands(
    state.transcript.items,
    state.times,
    placeable(records, state),
  )
  return {
    waiting,
    inserts: placed.map(({ request: record, after }) =>
      placedCards.keep(record.node, {
        key: `secret:${record.id}`,
        after,
        content: record.node,
        ...(record.unfolded ? { unfolded: true as const } : {}),
      }),
    ),
  }
}
