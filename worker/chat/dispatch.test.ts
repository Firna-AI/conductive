import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { sessionPaths } from '../../src/shared/sessions'
import { createHarness, type TestHarness } from '../test-support/harness'
import { CLAUDE, createChatFixture, WORKSPACE_ID } from './harness.test-support'

describe('durable runner dispatch', () => {
  let harness: TestHarness
  beforeAll(async () => {
    harness = await createHarness()
  })
  beforeEach(async () => {
    await harness.reset()
  })
  afterAll(async () => {
    await harness.dispose()
  })

  it('sends no command when dispatch storage fails and stops the queued turn immediately', async () => {
    const fixture = await createChatFixture(harness)
    const session = await fixture.createSession()
    const runner = await fixture.connect()
    runner.emit({ type: 'runner.ready' })
    await fixture.drain()
    let commits = 0
    fixture.storage.beforeCommit = async () => {
      if (++commits === 2) throw new Error('Injected dispatch commit failure')
    }
    const response = await fixture.fetch(
      sessionPaths.messages(fixture.org.id, WORKSPACE_ID, session.id),
      {
        id: 'must-wait',
        choice: CLAUDE,
        text: 'Keep this work queued',
        attachmentIds: [],
      },
    )
    expect(response.status).toBe(500)
    expect(runner.commands).toEqual([])
    fixture.storage.beforeCommit = null
    const turnId = await fixture.chat.store.read(WORKSPACE_ID, (view) =>
      view.messageTurn('must-wait'),
    )
    const stopped = await fixture.fetch(
      sessionPaths.interrupt(fixture.org.id, WORKSPACE_ID, session.id),
      { turnId },
    )
    expect(await stopped.json()).toEqual({ turnId, state: 'stopped' })
    expect(runner.commands).toEqual([])
    expect(
      await fixture.chat.store.read(WORKSPACE_ID, (view) => view.pending()),
    ).toEqual([])
    expect(
      (await fixture.history(session.id)).events.filter(
        ({ event }) => event.type === 'message.sent',
      ),
    ).toEqual([])
    fixture.transport.dropOutgoing = (message) => {
      if (message.type === 'turn') throw new Error('Injected turn send failure')
      return false
    }
    expect((await fixture.send(session.id, 'unsent-turn')).message.state).toBe(
      'queued',
    )
    const unsent = await fixture.chat.store.read(WORKSPACE_ID, (view) =>
      view.messageTurn('unsent-turn'),
    )
    const stopUnsent = await fixture.fetch(
      sessionPaths.interrupt(fixture.org.id, WORKSPACE_ID, session.id),
      { turnId: unsent },
    )
    expect(await stopUnsent.json()).toEqual({
      turnId: unsent,
      state: 'stopped',
    })
    expect(runner.commands).toEqual([])
  })
})
