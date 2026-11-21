import type { Session } from '../../src/shared/generated/Session'
import type { MessageSender } from '../../src/shared/generated/MessageSender'
import type { UserMessage } from '../../src/shared/generated/UserMessage'
import type { ChatTransaction } from './store'
import type { PendingCommand, StoredTurn } from './types'
import { turnChainStartedAt } from './turn-chain'
import { continuationMessage } from './continuation-message'

export async function prepareProviderContinuation(
  view: ChatTransaction,
  session: Session,
  previous: StoredTurn,
  sender: MessageSender,
  randomId: () => string,
): Promise<{ turn: StoredTurn; commands: PendingCommand[] }> {
  const commands: PendingCommand[] = []
  const pending = (await view.pending()).filter(
    (
      command,
    ): command is Extract<PendingCommand, { type: 'turn' | 'message' }> =>
      (command.type === 'turn' || command.type === 'message') &&
      command.turnId === previous.id,
  )
  const started = !pending.some((command) => command.type === 'turn')
  const next: StoredTurn = {
    id: randomId(),
    sessionId: previous.sessionId,
    senderId: previous.senderId,
    messageIds: [],
    state: 'queued',
    closeAfterStop: false,
    stopRequest: null,
    nextTurnId: previous.nextTurnId ?? null,
    chainStartedAt: await turnChainStartedAt(view, previous),
    providerContinuationStartedAt: null,
    providerContinuationSourceSessionId: session.id,
  }
  if (started)
    commands.push(
      await prependProviderContinuation(view, session, next, sender, randomId),
    )
  else if (previous.started !== false)
    next.providerRecovery = {
      sourceTurnId: previous.id,
      sender,
      started: false,
      acknowledgedMessageIds: [],
    }
  for (const command of pending) {
    const message = await view.message(command.messageId)
    if (!message || message.sessionId !== session.id) continue
    const type = next.messageIds.length ? 'message' : 'turn'
    next.messageIds.push(message.id)
    await view.saveMessageTurn(message.id, next.id)
    commands.push({
      ...command,
      type,
      commandId: randomId(),
      turnId: next.id,
    })
  }
  await view.saveTurn(next)
  if ((await view.newestTurn(session.id)) === previous.id)
    await view.saveNewestTurn(session.id, next.id)
  previous.nextTurnId = next.id
  previous.providerStop = { next: 'turn', continuationTurnId: next.id }
  return { turn: next, commands }
}

export async function prependProviderContinuation(
  view: ChatTransaction,
  session: Session,
  next: StoredTurn,
  sender: MessageSender,
  randomId: () => string,
): Promise<PendingCommand> {
  const message: UserMessage = {
    ...continuationMessage(
      next.providerContinuationSourceSessionId ?? session.id,
      randomId,
    ),
    sessionId: session.id,
    sender,
    choice: session.choice,
    attachments: [],
    createdAt: view.now,
    state: 'queued',
  }
  await view.saveMessage(message)
  next.messageIds.unshift(message.id)
  await view.saveMessageTurn(message.id, next.id)
  return {
    type: 'turn',
    commandId: randomId(),
    sessionId: session.id,
    turnId: next.id,
    messageId: message.id,
    attachments: [],
  }
}
