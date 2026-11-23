import type { User } from '../../src/shared/api'
import type { Session } from '../../src/shared/generated/Session'
import type { ChatTransaction } from './store'
import { TurnLifecycle } from './turn-lifecycle'

export type NoticeDestination =
  | { kind: 'existing'; turnId: string; senderId: string }
  | { kind: 'new'; senderId: string }

export interface AdmittedNotice {
  session: Session
  user: User
  destination: NoticeDestination
}

/** Choose the sender and turn together before checking the sender's access. */
export async function resolveNoticeDestination(
  view: ChatTransaction,
  session: Session,
  senderId: string,
): Promise<NoticeDestination> {
  const active = session.activeTurnId
    ? await view.turn(session.activeTurnId)
    : undefined
  return active?.state === 'running'
    ? { kind: 'existing', turnId: active.id, senderId: active.senderId }
    : { kind: 'new', senderId }
}

/** The same chat queue turn holds the admission check and this write. */
export async function turnForNotice(
  view: ChatTransaction,
  { session, destination }: AdmittedNotice,
  randomId: () => string,
) {
  if (destination.kind === 'new') {
    const turn = await new TurnLifecycle(view, session).select(
      destination.senderId,
      randomId,
      'new',
    )
    await view.saveNewestTurn(session.id, turn.id)
    return turn
  }
  const turn = await view.turn(destination.turnId)
  if (
    !turn ||
    turn.id !== session.activeTurnId ||
    turn.sessionId !== session.id ||
    turn.state !== 'running' ||
    turn.senderId !== destination.senderId
  )
    throw new Error('The authorized notice turn is no longer running.')
  return turn
}
