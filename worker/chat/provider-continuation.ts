import type { Session } from '../../src/shared/generated/Session'
import type { MessageSender } from '../../src/shared/generated/MessageSender'
import type { UserMessage } from '../../src/shared/generated/UserMessage'
import { productName } from '../../docs/mockups/src/brand'
import type { ChatTransaction } from './store'
import type { PendingCommand, StoredTurn } from './types'
import { turnChainStartedAt } from './turn-chain'

const PROVIDER_CONTINUATION_TEXT =
  `This message comes from ${productName}, not from a member. ` +
  'The cloud computer of this workspace stopped while you worked, and it started again. ' +
  'Your processes may have ended, also background tasks, dev servers, and shells. ' +
  'Continue the task from where you stopped. Do not repeat work that is done. ' +
  'Before you repeat an action outside this computer, such as a push, a pull request, or a message, check whether it already happened.'

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
  }
  if (started) {
    const id = `continuation:${previous.id}`
    const existing = await view.messageTurn(id)
    if (existing) {
      const stored = await view.turn(existing)
      if (stored) {
        previous.nextTurnId = stored.id
        return { turn: stored, commands }
      }
    }
    const message: UserMessage = {
      id,
      sessionId: session.id,
      sender,
      text: PROVIDER_CONTINUATION_TEXT,
      choice: session.choice,
      attachments: [],
      createdAt: view.now,
      state: 'queued',
    }
    await view.saveMessage(message)
    next.messageIds.push(id)
    await view.saveMessageTurn(id, next.id)
    commands.push({
      type: 'turn',
      commandId: randomId(),
      sessionId: session.id,
      turnId: next.id,
      messageId: id,
      attachments: [],
    })
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
  return { turn: next, commands }
}
