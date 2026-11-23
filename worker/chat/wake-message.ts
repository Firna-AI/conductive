import type { Session } from '../../src/shared/generated/Session'
import type { UserMessage } from '../../src/shared/generated/UserMessage'
import type { User } from '../../src/shared/api'
import type { ChatTransaction } from './store'
import { TurnLifecycle } from './turn-lifecycle'

/** Store the ordinary runner message without adding a member bubble. */
export async function saveWakeMessage(
  view: ChatTransaction,
  session: Session,
  user: User,
  input: { id: string; text: string; watchId?: string },
  randomId: () => string,
): Promise<string> {
  const turn = await new TurnLifecycle(view, session).select(
    user.id,
    randomId,
    input.watchId === undefined,
  )
  const message: UserMessage = {
    id: input.id,
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
  await view.saveNewestTurn(session.id, turn.id)
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
  return turn.id
}
