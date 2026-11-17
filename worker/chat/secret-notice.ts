import type {
  SecretRequest,
  SecretNoticeFailure,
} from '../../src/shared/secret-requests'
import type { UserMessage } from '../../src/shared/generated/UserMessage'
import {
  lateAnswerParts,
  lateAnswerText,
} from '../../src/shared/secret-late-answer'
import { readUser } from '../data/users'
import { memberSender } from '../tools/store'
import type { AppEnv } from '../env'
import { SenderAccessDenied } from './login-access'
import type { StoredSecretRequest } from '../secrets/request-records'
import type { ChatOperation } from './operation'
import type { ChatDependencies } from './types'
import { TurnLifecycle } from './turn-lifecycle'

function unavailable(
  reason: SecretNoticeFailure,
): NonNullable<SecretRequest['notice']> {
  return { state: 'not-sent', reason }
}

/** The caller holds the chat queue. This never creates a linked session. */
export async function acceptSecretNotice(
  operation: ChatOperation,
  record: StoredSecretRequest,
  env: AppEnv,
  dependencies: ChatDependencies,
): Promise<NonNullable<SecretRequest['notice']>> {
  const request = record.request
  const id = `secret-notice:${request.id}`
  const existing = await operation.read((view) => view.messageTurn(id))
  if (existing) return { state: 'sent', turnId: existing }
  const source = await operation.read((view) => view.session(request.sessionId))
  if (!source || source.closedAt !== null)
    return unavailable('login-unavailable')
  const activeTurnId = source.activeTurnId
  const active = activeTurnId
    ? await operation.read((view) => view.turn(activeTurnId))
    : undefined
  const senderId =
    active?.state === 'running' ? active.senderId : request.sender.id
  const member = await memberSender(env.DB, record.orgId, senderId)
  const user = member ? await readUser(env.DB, senderId) : null
  if (!user) return unavailable('sender-unavailable')
  try {
    const observed = await operation.logins.observe(
      source.id,
      undefined,
      senderId,
    )
    if (!observed.login)
      return unavailable(
        observed.session.loginAvailable && !observed.session.loginShared
          ? 'login-not-shared'
          : 'login-unavailable',
      )
  } catch (error) {
    if (error instanceof SenderAccessDenied)
      return unavailable('sender-unavailable')
    throw error
  }
  const name =
    request.answeredBy?.displayName ??
    request.answeredBy?.githubLogin ??
    'A member'
  const org = await env.DB.prepare('SELECT name FROM orgs WHERE id = ?')
    .bind(record.orgId)
    .first<{ name: string }>()
  const text = lateAnswerText(
    lateAnswerParts(request, name, org?.name ?? 'this org'),
  )
  return operation.change(async (view) => {
    const session = await view.session(source.id)
    if (!session || session.closedAt !== null)
      return unavailable('login-unavailable')
    const turn = await new TurnLifecycle(view, session).select(
      senderId,
      dependencies.randomId,
    )
    const message: UserMessage = {
      id,
      sessionId: session.id,
      text,
      sender: {
        id: user.id,
        githubLogin: user.githubLogin,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
      attachments: [],
      choice: session.choice,
      createdAt: view.now,
      state: 'queued',
    }
    await view.saveMessage(message)
    const type = turn.messageIds.length ? 'message' : 'turn'
    turn.messageIds.push(id)
    await view.saveTurn(turn)
    await view.saveMessageTurn(id, turn.id)
    await view.saveNewestTurn(session.id, turn.id)
    await view.saveCommand({
      type,
      commandId: dependencies.randomId(),
      sessionId: session.id,
      turnId: turn.id,
      messageId: id,
      attachments: [],
    })
    await view.emit({
      type: 'secrets.notice',
      sessionId: session.id,
      turnId: turn.id,
      requestId: request.id,
      text,
    })
    await view.saveSession(session)
    await view.emit({ type: 'session.updated', session })
    return { state: 'sent', turnId: turn.id }
  })
}
