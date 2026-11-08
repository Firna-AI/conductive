import type { StreamEnvelope } from '../api/read-workspace'
import type { ChatContext } from './context'
import { applyMoves, claimMoves, saveMovedView } from './model-moves'
import { asSessionEvent, sessionOf, type ChatEnvelope } from './session-log'
import { mergeSession, withWorkspaceChange } from './session-records'

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
  const changes = [...bySession].map(([id, events]) =>
    mergeSession(context, id, events),
  )
  // The newest records show in order, after changes of only a transcript.
  changes.sort(
    (left, right) =>
      (left.record?.eventNumber ?? 0) - (right.record?.eventNumber ?? 0),
  )
  const moves = claimMoves(
    context,
    changes.flatMap((change) => change.record?.session ?? []),
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
    for (const change of changes) next = change.apply(next)
    return applyMoves(next, moves)
  })
  saveMovedView(context, moves)
}
