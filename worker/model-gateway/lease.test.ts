import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import { MACHINE_ORIGIN } from '../chat/harness.test-support'
import { streamedRequest } from '../http/request-body.test-support'
import { createHarness, type TestHarness } from '../test-support/harness'
import {
  claudeClientHeaders,
  deferred,
  gatewayHttp,
  gatewayPath,
  openModelStream,
} from './http.test-support'
import type { TurnTokenCheck } from './types'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(() => harness.reset())
afterAll(() => harness.dispose())

it('refuses a late answer start with the turn code and cancels the pending fetch', async () => {
  const client = await gatewayHttp(harness)
  const entered = deferred<void>()
  const release = deferred<Response>()
  const answer = openModelStream()
  const upstreamResponse = new Response(answer.body)
  client.anthropic.responseFactories.push(() => {
    entered.resolve()
    return release.promise
  })
  const pending = client.request()
  try {
    await entered.promise
    await client.finish()
    await client.fixture.clock.advance(15_000)
    expect(client.anthropic.requests[0].signal.aborted).toBe(true)
    const refused = await pending
    expect(refused.status).toBe(409)
    expect(await refused.json()).toMatchObject({
      error: { code: 'turn_not_active' },
    })
    release.resolve(upstreamResponse)
    await answer.cancelled
    expect(client.anthropic.requests).toHaveLength(1)
  } finally {
    release.resolve(upstreamResponse)
    await pending
    await client.dispose()
  }
})

it('cancels a held upload and its early answer when the turn check refuses access', async () => {
  const client = await gatewayHttp(harness)
  const upload = openModelStream()
  const answer = openModelStream()
  const entered = deferred<void>()
  client.anthropic.responseFactories.push(() => {
    entered.resolve()
    return new Response(answer.body)
  })
  let settled = false
  const pending = client
    .fetch(
      streamedRequest(
        `${MACHINE_ORIGIN}${gatewayPath('claude')}`,
        upload.body,
        { ...claudeClientHeaders, 'x-api-key': client.token },
      ),
    )
    .then((response) => {
      settled = true
      return response
    })
  try {
    await entered.promise
    await client.finish()
    await client.fixture.clock.advance(14_999)
    expect(settled).toBe(false)
    await client.fixture.clock.advance(1)
    expect(client.anthropic.requests[0].signal.aborted).toBe(true)
    const refused = await pending
    expect(refused.status).toBe(409)
    expect(await refused.json()).toMatchObject({
      error: { code: 'turn_not_active' },
    })
    await upload.cancelled
    await answer.cancelled
    expect(client.anthropic.requests).toHaveLength(1)
  } finally {
    if (!settled) upload.source.close()
    const response = await pending
    if (response.body && !response.body.locked) await response.body.cancel()
    await client.dispose()
  }
})

it('refuses a request whose first turn check does not return within 30 seconds', async () => {
  const client = await gatewayHttp(harness)
  const held = deferred<TurnTokenCheck>()
  const entered = deferred<void>()
  vi.spyOn(client.endpoint, 'checkTurnToken').mockImplementation(() => {
    entered.resolve()
    return held.promise
  })
  try {
    const pending = client.request()
    await entered.promise
    await client.fixture.clock.advance(29_999)
    await client.fixture.clock.advance(1)
    const refused = await pending
    expect(refused.status).toBe(503)
    expect(await refused.json()).toMatchObject({
      error: { code: 'model_gateway_unavailable' },
    })
    expect(client.anthropic.requests).toHaveLength(0)
  } finally {
    held.resolve({ ok: false, reason: 'turn_not_active' })
    await client.dispose()
  }
})

it('keeps an answer streaming through a slow and a failed turn check, and ends it at a refusal', async () => {
  const client = await gatewayHttp(harness)
  const answer = openModelStream()
  client.anthropic.response = () => new Response(answer.body)
  const held = deferred<TurnTokenCheck>()
  const entered = deferred<void>()
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  try {
    const response = await client.request()
    const reader = response.body!.getReader()
    const checked = await client.endpoint.checkTurnToken(client.token)
    const spy = vi
      .spyOn(client.endpoint, 'checkTurnToken')
      .mockImplementationOnce(() => {
        entered.resolve()
        return held.promise
      })
      .mockRejectedValueOnce(new Error('The workspace object reset.'))
      .mockResolvedValueOnce({ ok: false, reason: 'turn_not_active' })
    const slow = client.fixture.clock.advance(15_000)
    await Promise.race([entered.promise, slow])
    await client.fixture.clock.advance(60_000)
    expect(client.anthropic.requests[0].signal.aborted).toBe(false)
    answer.source.enqueue(new TextEncoder().encode('late'))
    expect(new TextDecoder().decode((await reader.read()).value)).toBe('late')
    expect(spy).toHaveBeenCalledTimes(1)
    held.resolve(checked)
    await slow
    await client.fixture.clock.advance(0)
    expect(spy).toHaveBeenCalledTimes(2)
    expect(client.anthropic.requests[0].signal.aborted).toBe(false)
    await client.fixture.clock.advance(15_000)
    expect(spy).toHaveBeenCalledTimes(3)
    expect(client.anthropic.requests[0].signal.aborted).toBe(true)
    await expect(reader.read()).rejects.toThrow('The model turn ended.')
    await answer.cancelled
    expect(warn.mock.calls.map(([fields]) => fields.kind)).toEqual([
      'model_gateway_check_late',
      'model_gateway_check_failed',
    ])
  } finally {
    held.resolve({ ok: false, reason: 'turn_not_active' })
    await client.dispose()
  }
})
