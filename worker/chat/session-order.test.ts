import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import {
  sessionPaths,
  sessionsPath,
  type SessionsResponse,
} from '../../src/shared/sessions'
import { createHarness, type TestHarness } from '../test-support/harness'
import { createChatFixture, WORKSPACE_ID } from './harness.test-support'

describe('session display order', () => {
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

  it('lists sessions by creation time and closed sessions by last close before storage key order', async () => {
    const ids = ['z-session', 'a-session']
    const fixture = await createChatFixture(harness, {
      randomId: () => ids.shift() ?? 'close-command',
    })
    const z = await fixture.createSession()
    await fixture.clock.advance(1_000)
    const a = await fixture.createSession()
    expect(a.createdAt).toBe(z.createdAt + 1_000)
    const open: SessionsResponse = await (
      await fixture.fetch(sessionsPath(fixture.org.id, WORKSPACE_ID))
    ).json()
    expect(open.sessions.map((session) => session.id)).toEqual([
      'z-session',
      'a-session',
    ])
    expect(open.history).toEqual([])
    await fixture.clock.advance(1_000)
    await fixture.fetch(
      sessionPaths.close(fixture.org.id, WORKSPACE_ID, a.id),
      { stopRunningTurn: false },
    )
    const aClosedAt = fixture.clock.now()
    await fixture.clock.advance(1_000)
    await fixture.fetch(
      sessionPaths.close(fixture.org.id, WORKSPACE_ID, z.id),
      { stopRunningTurn: false },
    )
    const closed: SessionsResponse = await (
      await fixture.fetch(sessionsPath(fixture.org.id, WORKSPACE_ID))
    ).json()
    expect(closed.sessions).toEqual([])
    expect(
      closed.history.map((session) => ({
        id: session.id,
        closedAt: session.closedAt,
      })),
    ).toEqual([
      { id: 'z-session', closedAt: aClosedAt + 1_000 },
      { id: 'a-session', closedAt: aClosedAt },
    ])
  })
})
