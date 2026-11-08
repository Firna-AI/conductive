import type { StreamEnvelope } from '../api/read-workspace'
import { logOf, withTranscript, type ChatContext } from './context'
import { applyMoves, claimMoves, saveMovedView } from './model-moves'
import { asSessionEvent, sessionOf, type ChatEnvelope } from './session-log'
import { placeShown, withWorkspaceChange } from './session-records'

/**
 * Applies workspace stream events in order: chat events to the log of their
 * session, and records of the workspace, its start, and its sessions. Each
 * session record goes to the log of its session, which keeps the newest
 * record by event number. A batch, such as the history after a reconnect,
 * then shows only where each session ends, so an older close in the batch
 * cannot move the focus away from a session that the batch leaves open. An
 * event of the workspace or its start shows when no newer state of them
 * showed. The first record of a session that a model change opens moves the
 * draft in the same snapshot.
 */
export function applyEnvelopes(
  context: ChatContext,
  envelopes: readonly StreamEnvelope[],
): void {
  const bySession = new Map<string, ChatEnvelope[]>()
  for (const { eventNumber, occurredAt, event, late } of envelopes) {
    const chat = asSessionEvent(event)
    if (!chat) continue
    const events = bySession.get(sessionOf(chat)) ?? []
    events.push({ eventNumber, occurredAt, event: chat, late })
    bySession.set(sessionOf(chat), events)
  }
  const changed: string[] = []
  const recorded: string[] = []
  for (const [id, events] of bySession) {
    const log = logOf(context, id)
    const before = log.record
    if (!log.merge(events)) continue
    changed.push(id)
    if (log.record !== before) recorded.push(id)
  }
  // The sessions whose newest record changed, in the order of those records.
  recorded.sort(
    (left, right) =>
      (logOf(context, left).record?.eventNumber ?? 0) -
      (logOf(context, right).record?.eventNumber ?? 0),
  )
  const moves = claimMoves(
    context,
    recorded.flatMap((id) => logOf(context, id).record?.session ?? []),
  )
  context.store.update((snapshot) => {
    let next = snapshot
    for (const { eventNumber, event } of envelopes) {
      if (
        event?.type === 'workspace.updated' ||
        event?.type === 'workspace.title' ||
        event?.type === 'start.updated'
      ) {
        next = withWorkspaceChange(context, next, event, eventNumber)
      }
    }
    for (const id of recorded) next = placeShown(context, next, id)
    next = applyMoves(next, moves)
    for (const id of changed) {
      const log = logOf(context, id)
      next = withTranscript(next, id, log.transcript, log.times)
    }
    return next
  })
  saveMovedView(context, moves)
}
