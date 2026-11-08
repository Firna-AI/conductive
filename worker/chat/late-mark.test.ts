import { expect, it } from 'vitest'

import {
  choice,
  context,
  createRunnerLimitsFixture,
} from './runner-limits.test-support'

it('marks late events after refused turn boundaries and strips runner marks from active events', async () => {
  const fixture = await createRunnerLimitsFixture()
  await fixture.receive(1, {
    ...context,
    type: 'turn.started',
    senderId: 'wrong',
    choice,
    startedAt: 25,
    messageIds: [],
  })
  await fixture.receive(2, {
    ...context,
    type: 'turn.completed',
    state: 'finished',
  })
  await fixture.read(async (view) => {
    await view.saveTurn({
      id: 'newer',
      sessionId: 'session',
      senderId: 'sender',
      messageIds: [],
      state: 'running',
      started: true,
      closeAfterStop: false,
    })
    const session = await view.session('session')
    if (!session) throw new Error('The session is missing.')
    session.activeTurnId = 'newer'
    await view.saveSession(session)
  })
  const lateText = {
    ...context,
    type: 'assistant.delta',
    messageId: 'old-answer',
    text: 'Keep the late text.',
  }
  await fixture.receive(3, { ...lateText, late: false }, { late: false })
  const lateEnd = {
    ...context,
    type: 'turn.completed',
    state: 'finished',
    durationMs: 10,
    files: [],
    omittedFileCount: 0,
    userMessageIds: [],
  }
  await fixture.receive(4, lateEnd)
  const activeText = {
    ...context,
    type: 'assistant.delta',
    turnId: 'newer',
    messageId: 'new-answer',
    text: 'The new turn runs.',
  }
  await fixture.receive(5, { ...activeText, late: true }, { late: true })
  const history = await fixture.history()
  expect(history.events.slice(-3)).toEqual([
    {
      workspaceId: 'workspace',
      eventNumber: 4,
      occurredAt: 25,
      late: true,
      event: lateText,
    },
    {
      workspaceId: 'workspace',
      eventNumber: 5,
      occurredAt: 25,
      late: true,
      event: lateEnd,
    },
    {
      workspaceId: 'workspace',
      eventNumber: 6,
      occurredAt: 25,
      event: activeText,
    },
  ])
  expect(fixture.published.slice(-3)).toEqual(history.events.slice(-3))
  expect(await fixture.read((view) => view.session('session'))).toMatchObject({
    activeTurnId: 'newer',
  })
  expect(await fixture.read((view) => view.turn('turn'))).toMatchObject({
    state: 'failed',
  })
  expect(await fixture.read((view) => view.turn('newer'))).toMatchObject({
    state: 'running',
  })
})
