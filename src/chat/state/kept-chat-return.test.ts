import { expect, it } from 'vitest'
import type { ChatEvent } from '../../shared/chat-events'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { chatFor } from './test-kit'

const sessionId = FAKE_IDS.session
const turnId = 'turn-1'

it('shows the turn end and no running turn when it ended while the kept chat was hidden', async () => {
  const chat = chatFor({ conversation: 'running' })
  await chat.controller.start()
  const shownTurn = () =>
    chat.controller.getSnapshot().sessionStates[sessionId]?.transcript.turn ??
    null
  const record = () =>
    chat.controller
      .getSnapshot()
      .sessions.find((item) => item.id === sessionId) ?? null
  const activeTurn = () => ({
    activeTurnId: record()?.activeTurnId ?? null,
    activeTurnStartedAt: record()?.activeTurnStartedAt ?? null,
  })
  expect(shownTurn()?.turnId).toBe(turnId)
  expect(activeTurn()).toEqual({
    activeTurnId: turnId,
    activeTurnStartedAt: FAKE_TIME,
  })
  const session = record()
  if (!session) throw new Error('The running session is not open.')

  chat.controller.hide()
  const ended: readonly ChatEvent[] = [
    {
      sessionId,
      turnId,
      type: 'turn.completed',
      state: 'finished',
      durationMs: 60_000,
      files: [],
      omittedFileCount: 0,
      userMessageIds: [],
    },
    {
      type: 'session.updated',
      session: { ...session, activeTurnId: null, activeTurnStartedAt: null },
    },
  ]
  for (const event of ended)
    chat.server.events.store({
      workspaceId: FAKE_IDS.workspace,
      eventNumber: chat.nextEventNumber(),
      occurredAt: FAKE_TIME,
      event,
    })
  chat.controller.show()

  expect(shownTurn()).toBeNull()
  expect(activeTurn()).toEqual({
    activeTurnId: null,
    activeTurnStartedAt: null,
  })
  const ends = (
    chat.controller.getSnapshot().sessionStates[sessionId]?.transcript.items ??
    []
  ).filter((item) => item.kind === 'turn-end' && item.turnId === turnId)
  expect(ends).toEqual([expect.objectContaining({ durationMs: 60_000 })])
})
