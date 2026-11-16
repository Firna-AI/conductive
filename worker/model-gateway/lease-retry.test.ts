import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
} from 'vitest'

import { createHarness, type TestHarness } from '../test-support/harness'
import { gatewayHttp, openModelStream } from './http.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(() => harness.reset())
afterEach(() => vi.restoreAllMocks())
afterAll(() => harness.dispose())

it('keeps an answer open after one thrown periodic check and renews its lease on retry', async () => {
  const client = await gatewayHttp(harness)
  const answer = openModelStream()
  client.anthropic.response = () => new Response(answer.body)
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  try {
    const response = await client.request()
    const check = vi
      .spyOn(client.endpoint, 'checkTurnToken')
      .mockRejectedValueOnce(new Error(`private ${client.token}`))
    await client.fixture.clock.advance(15_000)
    expect(client.anthropic.requests[0].signal.aborted).toBe(false)
    await client.fixture.clock.advance(999)
    expect(check).toHaveBeenCalledTimes(1)
    await client.fixture.clock.advance(1)
    expect(check).toHaveBeenCalledTimes(2)
    expect(client.workspaceCalls).toHaveLength(3)
    await client.fixture.clock.advance(15_000)
    expect(check).toHaveBeenCalledTimes(3)
    expect(client.workspaceCalls).toHaveLength(4)
    expect(client.anthropic.requests[0].signal.aborted).toBe(false)
    answer.source.enqueue(new TextEncoder().encode('continued'))
    answer.source.close()
    expect(await response.text()).toBe('continued')
    expect(warn.mock.calls).toEqual([
      [
        {
          kind: 'model_gateway_check_failed',
          message: 'A periodic model turn check failed.',
          workspaceId: 'unknown',
          errorKind: 'error',
        },
      ],
      [
        {
          kind: 'model_gateway_check_retry',
          message: 'A periodic model turn check retries.',
          workspaceId: 'unknown',
          errorKind: 'error',
        },
      ],
    ])
  } finally {
    await client.dispose()
  }
})

it('retries thrown checks after 1, 2, then 4 seconds and ends the answer at lease expiry', async () => {
  const client = await gatewayHttp(harness)
  const answer = openModelStream()
  client.anthropic.response = () => new Response(answer.body)
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  try {
    const response = await client.request()
    const ended = response.text().then(
      () => null,
      (error: unknown) => error,
    )
    const check = vi
      .spyOn(client.endpoint, 'checkTurnToken')
      .mockRejectedValue(new Error(`private ${client.token}`))
    await client.fixture.clock.advance(15_000)
    expect(client.anthropic.requests[0].signal.aborted).toBe(false)
    for (const [delay, calls] of [
      [1_000, 2],
      [2_000, 3],
      [4_000, 4],
      [4_000, 5],
    ]) {
      await client.fixture.clock.advance(delay - 1)
      expect(check).toHaveBeenCalledTimes(calls - 1)
      await client.fixture.clock.advance(1)
      expect(check).toHaveBeenCalledTimes(calls)
    }
    await client.fixture.clock.advance(3_999)
    expect(client.anthropic.requests[0].signal.aborted).toBe(false)
    await client.fixture.clock.advance(1)
    expect(client.anthropic.requests[0].signal.aborted).toBe(true)
    expect(await ended).toMatchObject({
      code: 'model_gateway_unavailable',
      message: 'The model turn could not be checked.',
    })
    await answer.cancelled
    expect(client.workspaceCalls).toHaveLength(6)
    expect(warn).toHaveBeenCalledTimes(10)
    expect(warn).toHaveBeenLastCalledWith({
      kind: 'model_gateway_answer_ended',
      message: 'The gateway ended a model answer.',
      workspaceId: 'unknown',
      code: 'lease_expired',
    })
    await client.fixture.clock.advance(60_000)
    expect(check).toHaveBeenCalledTimes(5)
    expect(client.anthropic.requests).toHaveLength(1)
    expect(warn).toHaveBeenCalledTimes(10)
  } finally {
    await client.dispose()
  }
})

it('ends an answer on an overloaded check without a retry and logs only its kind', async () => {
  const client = await gatewayHttp(harness)
  const answer = openModelStream()
  client.anthropic.response = () => new Response(answer.body)
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  try {
    const response = await client.request()
    const rejected = expect(response.text()).rejects.toThrow(
      'The model turn could not be checked.',
    )
    const check = vi.spyOn(client.endpoint, 'checkTurnToken').mockRejectedValue(
      Object.assign(new Error(`private ${client.token}`), {
        overloaded: true,
      }),
    )
    await client.fixture.clock.advance(15_000)
    await rejected
    await answer.cancelled
    expect(client.anthropic.requests[0].signal.aborted).toBe(true)
    await client.fixture.clock.advance(60_000)
    expect(check).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls).toEqual([
      [
        {
          kind: 'model_gateway_check_failed',
          message: 'A periodic model turn check failed.',
          workspaceId: 'unknown',
          errorKind: 'overloaded',
        },
      ],
      [
        {
          kind: 'model_gateway_answer_ended',
          message: 'The gateway ended a model answer.',
          workspaceId: 'unknown',
          code: 'overloaded',
        },
      ],
    ])
  } finally {
    await client.dispose()
  }
})

it('does not retry a thrown first check before the upstream request', async () => {
  const client = await gatewayHttp(harness)
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  try {
    const check = vi
      .spyOn(client.endpoint, 'checkTurnToken')
      .mockRejectedValue(new Error(`private ${client.token}`))
    const response = await client.request()
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({
      error: { code: 'model_gateway_unavailable' },
    })
    await client.fixture.clock.advance(60_000)
    expect(check).toHaveBeenCalledTimes(1)
    expect(client.anthropic.requests).toEqual([])
    expect(warn.mock.calls).toEqual([
      [
        {
          kind: 'model_gateway_answer_ended',
          message: 'The gateway ended a model answer.',
          workspaceId: 'unknown',
          code: 'error',
        },
      ],
    ])
  } finally {
    await client.dispose()
  }
})
