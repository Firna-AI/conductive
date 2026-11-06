import type { User } from '../../src/shared/api'
import type {
  SendMessageRequest,
  SendMessageResponse,
  UserMessage,
} from '../../src/shared/messages'
import { HttpError } from '../http'
import { queueModel, sameAgent, sessionFor } from './sessions'
import type { ChatTransaction } from './store'
import type { ResolvedAttachments, StoredTurn } from './types'

export async function existingMessage(
  transaction: ChatTransaction,
  sessionId: string,
  input: SendMessageRequest,
  user: User,
): Promise<SendMessageResponse | null> {
  const existing = await transaction.message(input.id)
  if (!existing) return null
  if (
    existing.sessionId !== sessionId ||
    existing.sender.id !== user.id ||
    existing.text !== input.text ||
    existing.choice.agent !== input.choice.agent ||
    existing.choice.model !== input.choice.model ||
    existing.choice.effort !== input.choice.effort ||
    JSON.stringify(existing.attachments.map((attachment) => attachment.id)) !==
      JSON.stringify(input.attachmentIds)
  ) {
    throw new HttpError(
      409,
      'message_id_conflict',
      'Send the changed message with a new message ID.',
    )
  }
  return responseFor(transaction, existing)
}

export async function responseFor(
  transaction: ChatTransaction,
  message: UserMessage,
): Promise<SendMessageResponse> {
  const turnId = await transaction.messageTurn(message.id)
  const turn = turnId ? await transaction.turn(turnId) : undefined
  return { message, turnId: turn && turn.state !== 'queued' ? turn.id : null }
}

export async function acceptMessage(
  transaction: ChatTransaction,
  sessionId: string,
  input: SendMessageRequest,
  user: User,
  attachments: ResolvedAttachments,
  randomId: () => string,
): Promise<SendMessageResponse> {
  const existing = await existingMessage(transaction, sessionId, input, user)
  if (existing) return existing
  const session = await sessionFor(transaction, sessionId)
  sameAgent(session, input.choice)
  if (session.closedAt !== null) {
    throw new HttpError(
      409,
      'session_closed',
      'Reopen the session to send a message.',
    )
  }
  const message: UserMessage = {
    id: input.id,
    sessionId,
    text: input.text,
    sender: {
      id: user.id,
      githubLogin: user.githubLogin,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    },
    attachments: attachments.attachments,
    choice: input.choice,
    createdAt: transaction.now,
    state: 'queued',
  }
  await transaction.saveMessage(message)
  const changed =
    session.choice.model !== input.choice.model ||
    session.choice.effort !== input.choice.effort
  session.choice = input.choice
  if (changed) await queueModel(transaction, session, randomId())
  let turn = session.activeTurnId
    ? await transaction.turn(session.activeTurnId)
    : undefined
  const type = turn ? 'message' : 'turn'
  if (!turn) {
    turn = {
      id: randomId(),
      sessionId,
      senderId: user.id,
      messageIds: [],
      state: 'queued',
      closeAfterStop: false,
    }
    session.activeTurnId = turn.id
  }
  turn.messageIds.push(message.id)
  await transaction.saveTurn(turn)
  await transaction.saveMessageTurn(message.id, turn.id)
  await transaction.saveCommand({
    type,
    commandId: randomId(),
    sessionId,
    turnId: turn.id,
    messageId: message.id,
    attachments: attachments.paths,
  })
  await transaction.emit({ type: 'message.accepted', message })
  await transaction.saveSession(session)
  await transaction.emit({ type: 'session.updated', session })
  return responseFor(transaction, message)
}

export async function markSent(
  transaction: ChatTransaction,
  turn: StoredTurn,
  messageId: string,
): Promise<void> {
  const message = await transaction.message(messageId)
  if (
    !message ||
    message.sessionId !== turn.sessionId ||
    !turn.messageIds.includes(messageId)
  ) {
    throw new HttpError(
      400,
      'runner_message_mismatch',
      'The message is not available.',
    )
  }
  if (message.state === 'sent') return
  message.state = 'sent'
  await transaction.saveMessage(message)
  await transaction.emit({
    type: 'message.sent',
    sessionId: turn.sessionId,
    messageId,
    turnId: turn.id,
  })
}
