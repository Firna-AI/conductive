import type {
  AnswerSecretRequest,
  SecretRequest,
} from '../../shared/secret-requests'
import { secretSetKey } from '../../ui/components/chat/requestStackOrder'
import type { WaitingItem } from '../components/request-stack'
import type { AnswerKind } from './secret-snapshot'
import type { RecoveryLogin } from './secret-words'
import { SecretRequestCard } from './SecretRequestCard'

/** What each card of the stack shares: its readers and its answers. */
export interface StackedSecrets {
  viewerId: string | null
  org: string
  login: RecoveryLogin | null
  /** The chat takes answers. */
  choices: boolean
  /** The answer of this window that runs, by request ID. */
  answers: Readonly<Record<string, AnswerKind>>
  onAnswer: (requestId: string, answer: AnswerSecretRequest) => void
  /** Denies each request of a card that hides requests, as `denySecrets` says. */
  onDeny: (requestIds: readonly string[]) => void
}

/**
 * The card of an open request on top of the stack, in its stacked form.
 * When it hides older requests for the same secrets, it says how often the
 * agent asked, and its Deny also denies each of them, the shown request
 * last. An answer of any of them makes the card wait for it.
 */
function stackedCard(
  request: SecretRequest,
  hidden: readonly WaitingItem[],
  shared: StackedSecrets,
) {
  const ids = hidden.map((item) => item.id)
  const answering = [request.id, ...ids]
    .map((id) => shared.answers[id])
    .find((kind) => kind !== undefined)
  return (
    <SecretRequestCard
      answering={answering ?? null}
      choices={shared.choices}
      hides={ids.length}
      inStack
      key={`${request.id}:open`}
      login={shared.login}
      onAnswer={
        ids.length === 0
          ? shared.onAnswer
          : (id, answer) =>
              answer.kind === 'deny'
                ? shared.onDeny([...ids, id])
                : shared.onAnswer(id, answer)
      }
      org={shared.org}
      request={request}
      viewerId={shared.viewerId}
    />
  )
}

/**
 * The open secret requests of the shown session, whose tool calls wait or
 * that are late, as the stack above the composer takes them. A request
 * made at the same time as another follows its first event number. Any
 * member who sees the session answers each of them where the chat takes
 * answers.
 */
export function waitingSecrets(
  open: readonly { request: SecretRequest; firstNumber: number | null }[],
  shared: StackedSecrets,
): WaitingItem[] {
  return open.map(({ request, firstNumber }) => ({
    id: request.id,
    key: `secret:${request.id}`,
    createdAt: request.createdAt,
    order: firstNumber ?? Number.MAX_SAFE_INTEGER,
    callWaits: request.state === 'waiting',
    secrets: secretSetKey(request.secrets.map((secret) => secret.name)),
    answerable: shared.choices,
    card: (hidden) => stackedCard(request, hidden, shared),
  }))
}
