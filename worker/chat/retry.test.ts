import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { SendMessageResponse } from '../../src/shared/messages'
import { createHarness, type TestHarness } from '../test-support/harness'
import { createChatFixture, WORKSPACE_ID } from './harness.test-support'
import {
  liveSessions,
  retryRequest,
  retryUnavailable,
  sessionRecord,
} from './retry.test-support'
import {
  lifecycleSnapshot,
  messageCommands,
  startTurn,
  terminalEvent,
} from './turn-lifecycle.test-support'

describe('newest failed turn retries', () => {
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

  it('rejects a stale second tab after newer queued, running, finished, and failed work', async () => {
    const fixture = await createChatFixture(harness)
    const session = await fixture.createSession()
    expect(session.retryMessageId).toBeNull()
    const runner = await fixture.connect()
    runner.emit({ type: 'runner.ready' })
    await fixture.drain()
    const old = await startTurn(fixture, runner, session.id, 'old-request')
    const currentTab = await fixture.tab()
    const staleTab = await fixture.tab(0, undefined, fixture.memberCookie)
    runner.emit(terminalEvent(old, 'failed'))
    await fixture.drain()
    const staleFailure = liveSessions(staleTab.messages).at(-1)
    staleTab.close()
    runner.disconnect()
    await fixture.send(session.id, 'new-request')
    for (const phase of ['queued', 'running', 'finished', 'failed'] as const) {
      const before = await lifecycleSnapshot(fixture)
      const commands = structuredClone(runner.commands)
      const response = await retryRequest(
        fixture,
        session.id,
        'old-request',
        fixture.memberCookie,
      )
      expect(response.status, phase).toBe(409)
      expect(await response.json(), phase).toEqual(retryUnavailable)
      expect(await lifecycleSnapshot(fixture), phase).toEqual(before)
      expect(runner.commands, phase).toEqual(commands)
      if (phase === 'queued') {
        await fixture.connect(runner)
      } else if (phase === 'running') {
        const next = messageCommands(runner, 'new-request')[0]
        if (next?.type !== 'turn') throw new Error('The new turn is missing.')
        runner.emit(terminalEvent(next, 'finished'))
        await fixture.drain()
      } else if (phase === 'finished') {
        const latest = await startTurn(fixture, runner, session.id, 'latest')
        runner.emit(terminalEvent(latest, 'failed'))
        await fixture.drain()
      }
    }
    expect(staleFailure?.retryMessageId).toBe('old-request')
    expect(staleFailure?.activeTurnId).toBeNull()
    expect((await sessionRecord(fixture, session.id)).retryMessageId).toBe(
      'latest',
    )
    expect(
      liveSessions(currentTab.messages).map((record) => record.retryMessageId),
    ).toEqual(['old-request', null, null, null, 'latest'])
    const beforeLate = await lifecycleSnapshot(fixture)
    runner.emit(terminalEvent(old, 'failed'))
    runner.emit(
      Object.assign(terminalEvent(old, 'finished'), { durationMs: -1 }),
    )
    await fixture.drain()
    expect(await lifecycleSnapshot(fixture)).toEqual(beforeLate)
    expect((await sessionRecord(fixture, session.id)).retryMessageId).toBe(
      'latest',
    )
    const lost = await startTurn(fixture, runner, session.id, 'lost-error')
    runner.emit(
      Object.assign(terminalEvent(lost, 'failed'), { durationMs: -1 }),
    )
    await fixture.drain()
    const refused = await retryRequest(fixture, session.id, 'lost-error')
    expect(refused.status).toBe(409)
    expect(await refused.json()).toEqual(retryUnavailable)
    expect((await sessionRecord(fixture, session.id)).retryMessageId).toBeNull()
    expect((await sessionRecord(fixture, session.id)).activeTurnId).toBeNull()
    currentTab.close()
  })

  it('makes a failed retry eligible by its new message ID', async () => {
    const fixture = await createChatFixture(harness)
    const session = await fixture.createSession()
    const runner = await fixture.connect()
    runner.emit({ type: 'runner.ready' })
    await fixture.drain()
    const original = await startTurn(fixture, runner, session.id, 'original')
    await fixture.send(session.id, 'chosen')
    runner.emit(
      Object.assign(terminalEvent(original, 'failed'), {
        retryMessageId: 'chosen',
      }),
    )
    await fixture.drain()
    const unlisted = await retryRequest(fixture, session.id, 'original')
    expect(unlisted.status).toBe(409)
    expect(await unlisted.json()).toEqual(retryUnavailable)
    const response = await retryRequest(fixture, session.id, 'chosen')
    expect(response.status).toBe(202)
    const first: SendMessageResponse = await response.json()
    const retried = messageCommands(runner, first.message.id)[0]
    if (retried?.type !== 'turn') throw new Error('The retry turn is missing.')
    runner.emit(terminalEvent(retried, 'failed'))
    await fixture.drain()
    expect((await sessionRecord(fixture, session.id)).retryMessageId).toBe(
      first.message.id,
    )
    const old = await retryRequest(fixture, session.id, 'chosen')
    expect(old.status).toBe(409)
    expect(await old.json()).toEqual(retryUnavailable)
    const latest = await retryRequest(fixture, session.id, first.message.id)
    expect(latest.status).toBe(202)
    const second: SendMessageResponse = await latest.json()
    expect(second.message.id).not.toBe(first.message.id)
    expect(second.message.text).toBe('Check this code')
    expect((await sessionRecord(fixture, session.id)).retryMessageId).toBeNull()
    expect(
      (await fixture.history(session.id)).events.flatMap(({ event }) =>
        event.type === 'message.accepted' ? [event.message.id] : [],
      ),
    ).toEqual(['original', 'chosen', first.message.id, second.message.id])
    expect(
      await fixture.chat.store.read(WORKSPACE_ID, (view) => view.turns()),
    ).toHaveLength(3)
  })
})
