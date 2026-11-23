import type { ActiveRunner } from './types'
import type { ChatTransaction } from './store'
import { turnHasRunnerStart } from './capability-start-evidence'

export async function queueCapabilityNotices(
  view: ChatTransaction,
  active: ActiveRunner,
  randomId: () => string,
): Promise<void> {
  if (active.state.capabilityNotices !== true) return
  for (const session of await view.sessions()) {
    if (session.closedAt !== null || !session.activeTurnId) continue
    const turn = await view.turn(session.activeTurnId)
    if (!turn || !(await turnHasRunnerStart(view, turn))) continue
    const waiting = (await view.capabilityNotes.waiting(session.id)).filter(
      (note) => note.sentTurnId === null,
    )
    if (!waiting.length) continue
    await view.capabilityNotes.take(session.id, turn.id)
    await view.saveCommand({
      type: 'notice',
      commandId: randomId(),
      sessionId: session.id,
      turnId: turn.id,
      noticeIds: waiting.map((note) => note.id),
    })
  }
}
