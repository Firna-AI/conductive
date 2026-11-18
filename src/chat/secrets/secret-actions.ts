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

/**
 * Sends the answer of a member to a request that is open: Deny, Allow, or
 * the values that a request asks for, with how long they last (secrets
 * decisions 4 B and 7). Any member who sees the session answers. While the
 * answer runs, the request takes no other answer. Its reply shows the new
 * state at once, and the events of the workspace follow. A failure shows its
 * cause, and the choices come back.
 */
export async function answerSecret(
  context: ChatContext,
  requestId: string,
  answer: AnswerSecretRequest,
): Promise<void> {
  const { secrets } = context.store.get()
  const known = secrets.requests[requestId]
  if (!known || !isOpen(known.request) || requestId in secrets.answers) return
  update(context, (current) => withAnswer(current, requestId, answer.kind))
  try {
    const request = await context.secrets.answer(
      context.target,
      requestId,
      answer,
    )
    if (!context.live()) return
    update(context, (current) =>
      withAnswer(withRequestReply(current, request), requestId, null),
    )
  } catch (error) {
    if (!context.live()) return
    update(context, (current) => withAnswer(current, requestId, null))
    showNotice(
      context,
      known.request.sessionId,
      'The answer was not sent',
      error,
    )
  }
}
