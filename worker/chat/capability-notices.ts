import type { ActiveRunner } from './types'
import type { ChatTransaction } from './store'
import { capabilityChangeText } from '../../src/shared/capability-change'

export async function queueCapabilityNotices(
  view: ChatTransaction,
  active: ActiveRunner,
  randomId: () => string,
): Promise<void> {
  if (active.capabilityNotices !== true) return
  for (const session of await view.sessions()) {
    if (session.closedAt !== null || !session.activeTurnId) continue
    const turn = await view.turn(session.activeTurnId)
    if (turn?.state !== 'running' || !turn.runnerStarted) continue
    const waiting = (await view.capabilityNotes.waiting(session.id)).filter(
      (note) => note.sentTurnId === null,
    )
    if (!waiting.length) continue
    const notices = waiting.map((note) => ({
      id: note.id,
      text: capabilityChangeText(note.member, note.changes),
    }))
    await view.capabilityNotes.take(session.id, turn.id)
    await view.saveCommand({
      type: 'notice',
      commandId: randomId(),
      sessionId: session.id,
      turnId: turn.id,
      notices,
    })
  }
}
