import type { UserMessage } from '../../src/shared/generated/UserMessage'
import { turnForNotice, type AdmittedNotice } from './notice-destination'
import type { ChatTransaction } from './store'

/** Store the ordinary runner message without adding a member bubble. */
export async function saveWakeMessage(
  view: ChatTransaction,
  admission: AdmittedNotice,
  input: { text: string; watchId?: string },
  randomId: () => string,
): Promise<{ messageId: string; turnId: string }> {
  const { session, user } = admission
  const turn = await turnForNotice(view, admission, randomId)
  let messageId = randomId()
  while ((await view.message(messageId)) || (await view.messageTurn(messageId)))
    messageId = randomId()
  const message: UserMessage = {
    id: messageId,
    sessionId: session.id,
    text: input.text,
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
  turn.messageIds.push(message.id)
  await view.saveTurn(turn)
  await view.saveMessageTurn(message.id, turn.id)
  await view.saveCommand({
    type,
    commandId: randomId(),
    sessionId: session.id,
    turnId: turn.id,
    messageId: message.id,
    wakeUp: true,
    ...(input.watchId === undefined ? {} : { sessionWatchId: input.watchId }),
    attachments: [],
  })
  return { messageId, turnId: turn.id }
}
