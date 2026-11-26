import { expect, it } from 'vitest'
import type { ChatEvent } from '../../shared/chat-events'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { chatFor } from './test-kit'

const sessionId = FAKE_IDS.session
const turnId = 'turn-1'

it('ends the shown running turn when it ended while the kept chat was hidden', async () => {
  const chat = chatFor({ conversation: 'running' })
  await chat.controller.start()
  const shownTurn = () =>
    chat.controller.getSnapshot().sessionStates[sessionId]?.transcript.turn ??
    null
  expect(shownTurn()?.turnId).toBe(turnId)
  const session = chat.controller
    .getSnapshot()
    .sessions.find((item) => item.id === sessionId)
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
})
