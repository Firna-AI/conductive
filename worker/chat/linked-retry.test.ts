import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createHarness, type TestHarness } from '../test-support/harness'
import { checkCommitBoundaries } from './commit-boundary.test-support'
import { linkedRetryBoundaryFixture } from './linked-retry-boundaries.test-support'
import type { SendMessageResponse } from '../../src/shared/messages'
import { createChatFixture } from './harness.test-support'
import {
  liveSessions,
  retryRequest,
  retryUnavailable,
  sessionRecord,
} from './retry.test-support'
describe('linked retry after starter revocation', () => {
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
  it('fails queued input in its original session and consumes its retry only after linked acceptance commits', async () => {
    const fixture = await createChatFixture(harness)
    const source = await fixture.createSession()
    await fixture.send(source.id, 'queued', fixture.memberCookie)
    const ownerTab = await fixture.tab()
    const memberTab = await fixture.tab(0, undefined, fixture.memberCookie)
    await harness.env.DB.prepare('DELETE FROM agent_logins WHERE user_id = ?')
      .bind(fixture.owner.id)
      .run()
    const runner = await fixture.connect()
    runner.emit({ type: 'runner.ready' })
    await fixture.drain()
    expect(runner.commands).toEqual([])
    expect(await sessionRecord(fixture, source.id)).toMatchObject({
      loginAvailable: false,
      activeTurnId: null,
      retryMessageId: 'queued',
      startedBy: { id: fixture.owner.id },
    })
    const failure = (await fixture.history(source.id)).events
      .map(({ event }) => event)
      .find((event) => event.type === 'turn.failed')
    expect(failure).toMatchObject({
      error: {
        code: 'agent_login_required',
        message:
          "Octocat's Claude login is not available. Try again or send a new message.",
      },
      retryMessageId: 'queued',
    })
    const response = await retryRequest(
      fixture,
      source.id,
      'queued',
      fixture.memberCookie,
    )
    expect(response.status).toBe(202)
    const linked: SendMessageResponse = await response.json()
    expect(linked).toMatchObject({
      session: {
        startedBy: { id: fixture.member.id },
        sourceSessionId: source.id,
        retryMessageId: null,
      },
      message: { sender: { id: fixture.member.id }, text: 'Check this code' },
    })
    expect(linked.message.sessionId).toBe(linked.session.id)
    expect((await sessionRecord(fixture, source.id)).retryMessageId).toBeNull()
    const stale = await retryRequest(
      fixture,
      source.id,
      'queued',
      fixture.ownerCookie,
    )
    expect(stale.status).toBe(409)
    expect(await stale.json()).toEqual(retryUnavailable)
    expect(
      (await fixture.history(source.id)).events.filter(
        ({ event }) => event.type === 'message.accepted',
      ),
    ).toMatchObject([
      { event: { message: { id: 'queued', sessionId: source.id } } },
    ])
    expect(
      liveSessions(ownerTab.messages)
        .filter((record) => record.id === source.id)
        .map((record) => record.retryMessageId),
    ).toEqual([null, 'queued', null])
    expect(memberTab.messages).toEqual(ownerTab.messages)
    await ownerTab.close()
    await memberTab.close()
  })
  it('keeps every linked Retry acceptance record across both commit boundaries', async () => {
    await checkCommitBoundaries(() => linkedRetryBoundaryFixture(harness))
  })
})
