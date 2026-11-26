import type { ApiClient } from '../../app/api/client'
import {
  secretAnswerPath,
  type AnswerSecretRequest,
  type SecretRequest,
} from '../../shared/secret-requests'
import type { WorkspaceTarget } from '../api/client'
import { record, type Reader } from '../api/json'
import { showNotice, type ChatContext } from '../state/context'
import { readRequest } from './read-secret-events'
import {
  isOpen,
  withAnswer,
  withRequestReply,
  type SecretsSnapshot,
} from './secret-snapshot'

const readAnswered: Reader<SecretRequest> = (value) =>
  readRequest(record(value, 'answer').request)

/** The route of the answers of members, through the client of the chat. */
export function createSecretApi(client: ApiClient) {
  return {
    answer: (
      target: WorkspaceTarget,
      requestId: string,
      answer: AnswerSecretRequest,
    ) =>
      client.send(
        'POST',
        secretAnswerPath(target.orgId, target.workspaceId, requestId),
        answer,
        readAnswered,
      ),
  }
}

export type SecretApi = ReturnType<typeof createSecretApi>

function update(
  context: ChatContext,
  change: (secrets: SecretsSnapshot) => SecretsSnapshot,
): void {
  context.store.update((snapshot) => ({
    ...snapshot,
    secrets: change(snapshot.secrets),
  }))
}

/** Whether a member can answer a request now: it is open, and no answer runs. */
function answerable(secrets: SecretsSnapshot, requestId: string): boolean {
  const known = secrets.requests[requestId]
  return (
    known !== undefined &&
    isOpen(known.request) &&
    !(requestId in secrets.answers)
  )
}

/**
 * Sends one answer whose mark is set, and clears the mark with its result.
 * Its reply shows the new state at once, and the events of the workspace
 * follow. A failure shows its cause, and the choices come back. It says
 * whether the answer went through.
 */
async function send(
  context: ChatContext,
  request: SecretRequest,
  answer: AnswerSecretRequest,
): Promise<boolean> {
  try {
    const answered = await context.secrets.answer(
      context.target,
      request.id,
      answer,
    )
    if (!context.live()) return false
    update(context, (current) =>
      withAnswer(withRequestReply(current, answered), request.id, null),
    )
    return true
  } catch (error) {
    if (!context.live()) return false
    update(context, (current) => withAnswer(current, request.id, null))
    showNotice(context, request.sessionId, 'The answer was not sent', error)
    return false
  }
}

/**
 * Sends the answer of a member to a request that is open: Deny, Allow, or
 * the values that a request asks for, with how long they last (secrets
 * decisions 4 B and 7). Any member who sees the session answers. While the
 * answer runs, the request takes no other answer. An Allow also settles
 * each other open request that its grant covers, in the Worker.
 */
export async function answerSecret(
  context: ChatContext,
  requestId: string,
  answer: AnswerSecretRequest,
): Promise<void> {
  const { secrets } = context.store.get()
  const known = secrets.requests[requestId]
  if (!known || !answerable(secrets, requestId)) return
  update(context, (current) => withAnswer(current, requestId, answer.kind))
  await send(context, known.request, answer)
}

/**
 * Denies each request of a card of the stack that hides older requests for
 * the same secrets, with one Deny for each, as the request stack says.
 * `requestIds` names the hidden requests, then the request that the card
 * shows, last. While the Denies run, each request takes no other answer.
 * The hidden requests go first, so the card keeps the request that it
 * shows until it leaves. When a Deny of a hidden request fails, the shown
 * request stays open, with its choices.
 */
export async function denySecrets(
  context: ChatContext,
  requestIds: readonly string[],
): Promise<void> {
  const { secrets } = context.store.get()
  const open = requestIds.flatMap((id) => {
    const known = secrets.requests[id]
    return known && answerable(secrets, id) ? [known.request] : []
  })
  const shown = open.at(-1)
  if (shown === undefined) return
  update(context, (current) =>
    open.reduce(
      (next, request) => withAnswer(next, request.id, 'deny'),
      current,
    ),
  )
  const deny = { kind: 'deny' } as const
  const hidden = await Promise.all(
    open.slice(0, -1).map((request) => send(context, request, deny)),
  )
  if (hidden.every(Boolean)) await send(context, shown, deny)
  else if (context.live())
    update(context, (current) => withAnswer(current, shown.id, null))
}
