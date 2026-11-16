import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { WORKSPACE_ID } from '../chat/harness.test-support'
import { chatKey } from '../chat/storage-keys'
import { createHarness, type TestHarness } from '../test-support/harness'
import { deferred, gatewayHttp, openModelStream } from './http.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(() => harness.reset())
afterAll(() => harness.dispose())

it('keeps an answer open while the chat queue is held by lifecycle work', async () => {
  const client = await gatewayHttp(harness)
  const answer = openModelStream()
  client.anthropic.response = () => new Response(answer.body)
  const entered = deferred<void>()
  const release = deferred<void>()
  const response = await client.request()
  const holding = client.fixture.chat.runLifecycle(async () => {
    entered.resolve()
    await release.promise
  })
  await entered.promise
  const queued = await client.fixture.observeNextQueued()
  const checking = client.fixture.clock.advance(15_000)
  try {
    expect(
      await Promise.race([
        checking.then(() => 'checked'),
        queued.queued.then(() => 'queued'),
      ]),
    ).toBe('checked')
    await client.fixture.clock.advance(30_000)
    expect(client.checks).toHaveLength(4)
    expect(client.anthropic.requests[0].signal.aborted).toBe(false)
    answer.source.enqueue(new TextEncoder().encode('continued'))
    answer.source.close()
    expect(await response.text()).toBe('continued')
  } finally {
    release.resolve()
    await holding
    await checking
    await queued.restore()
    await response.body?.cancel().catch(() => undefined)
    await client.dispose()
  }
})

it('checks a read refusal again in the queue and accepts the restored running turn', async () => {
  const client = await gatewayHttp(harness)
  const { fixture, turn } = client
  const entered = deferred<void>()
  const release = deferred<void>()
  const read = deferred<void>()
  const changeState = (state: 'running' | 'stopping') =>
    fixture.chat.store.change(
      WORKSPACE_ID,
      async (transaction) => {
        const stored = await transaction.turn(turn.turnId)
        if (!stored) throw new Error('The turn is missing.')
        stored.state = state
        await transaction.saveTurn(stored)
      },
      () => undefined,
    )
  const holding = fixture.chat.runLifecycle(async () => {
    await changeState('stopping')
    entered.resolve()
    await release.promise
    await changeState('running')
  })
  await entered.promise
  await fixture.setStorageHooks({
    afterRead: async (key) => {
      if (key === chatKey('turn', turn.turnId)) read.resolve()
    },
  })
  const queued = await fixture.observeNextQueued()
  let settled = false
  const checking = client.check().then((value) => {
    settled = true
    return value
  })
  try {
    expect(
      await Promise.race([
        read.promise.then(() => 'read'),
        queued.queued.then(() => 'queued'),
      ]),
    ).toBe('read')
    await queued.queued
    expect(settled).toBe(false)
    release.resolve()
    await holding
    expect(await checking).toEqual({
      ok: true,
      login: { agent: 'claude', kind: 'api-key', secret: client.secret },
    })
    await fixture.clearFaults()
    const stored = await fixture.chat.store.read(WORKSPACE_ID, (view) =>
      view.turn(turn.turnId),
    )
    expect(stored?.state).toBe('running')
  } finally {
    release.resolve()
    await holding
    await checking
    await queued.restore()
    await fixture.clearFaults()
    await client.dispose()
  }
})
