import type { ReactElement, ReactNode } from 'react'
import type {
  AnswerSecretRequest,
  SecretRequest,
} from '../../shared/secret-requests'
import { placeCommands } from '../../shared/transcript/command-placement'
import type { TranscriptInsert } from '../../shared/transcript/transcript-entries'
import { KeptParts, sameData, sameElement } from '../components/same-data'
import type { ChatSnapshot, SessionState } from '../state/chat-snapshot'
import { LateAnswerLine } from './LateAnswerLine'
import { isOpen } from './secret-snapshot'
import { lateAnswerParts } from './secret-words'
import { SecretRequestCard } from './SecretRequestCard'
import { SecretRunCard } from './SecretRunCard'
import { agentNames } from '../../shell/account/labels'

/** A part that waits just above the composer, in the order of its time. */
export interface WaitingItem {
  key: string
  createdAt: number
  node: ReactNode
}

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
 * The secret requests, runs, and late answers of the shown session, as the
 * events of the workspace give them. A request that waits for its tool call
 * waits just above the composer. Each other request is a card at its place
 * in its turn, and a request that ever became late never folds with the work
 * of its turn. A request that a member allowed in time shows once, as its
 * run. A request that a member denied in time shows as a denied run. Each
 * run folds with its turn, and the line of a late answer stays in view. The
 * order follows the copy of the session: the time of each record, then its
 * first event. `choices` says that the chat takes answers.
 */
export function sessionSecrets(
  snapshot: ChatSnapshot,
  sessionId: string | null,
  state: SessionState,
  props: {
    choices: boolean
    onAnswer: (requestId: string, answer: AnswerSecretRequest) => void
  },
): { waiting: WaitingItem[]; inserts: TranscriptInsert<ReactNode>[] } {
  const { requests, runs, notices, answers } = snapshot.secrets
  const viewerId = snapshot.account?.user.id ?? null
  const org = snapshot.org?.name ?? 'This org'
  const session = [...snapshot.sessions, ...snapshot.history].find(
    (item) => item.id === sessionId,
  )
  const starter = session
    ? { person: session.startedBy, agent: agentNames[session.choice.agent] }
    : null
  const card = (request: SecretRequest) =>
    cards.keep(
      request,
      <SecretRequestCard
        answering={answers[request.id] ?? null}
        choices={props.choices}
        key={`${request.id}:${isOpen(request) ? 'open' : 'ended'}`}
        onAnswer={props.onAnswer}
        org={org}
        request={request}
        starter={starter}
        viewerId={viewerId}
      />,
    )
  const own = Object.values(requests).filter(
    ({ request }) => request.sessionId === sessionId,
  )
  const waiting = own
    .filter(({ request }) => request.state === 'waiting')
    .map(({ request }) => ({
      key: `secret:${request.id}`,
      createdAt: request.createdAt,
      node: card(request),
    }))
  const records: SecretRecord[] = [
    ...own
      .filter(({ request }) => request.state !== 'waiting' && !runs[request.id])
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
  const placed = placeCommands(state.transcript.items, state.times, records)
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
