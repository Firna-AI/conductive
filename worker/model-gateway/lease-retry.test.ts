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

it('keeps an answer open after one thrown periodic check and checks again at the next interval', async () => {
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
    await client.fixture.clock.advance(14_999)
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
    ])
  } finally {
    await client.dispose()
  }
})

it('keeps an answer open through repeated failed checks until the answer completes', async () => {
  const client = await gatewayHttp(harness)
  const answer = openModelStream()
  client.anthropic.response = () => new Response(answer.body)
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  try {
    const response = await client.request()
    const check = vi
      .spyOn(client.endpoint, 'checkTurnToken')
      .mockRejectedValue(new Error(`private ${client.token}`))
    await client.fixture.clock.advance(15_000)
    expect(client.anthropic.requests[0].signal.aborted).toBe(false)
    for (const calls of [2, 3, 4, 5]) {
      await client.fixture.clock.advance(14_999)
      expect(check).toHaveBeenCalledTimes(calls - 1)
      await client.fixture.clock.advance(1)
      expect(check).toHaveBeenCalledTimes(calls)
    }
    expect(client.anthropic.requests[0].signal.aborted).toBe(false)
    answer.source.enqueue(new TextEncoder().encode('continued'))
    answer.source.close()
    expect(await response.text()).toBe('continued')
    expect(client.workspaceCalls).toHaveLength(6)
    expect(warn).toHaveBeenCalledTimes(5)
    expect(warn).toHaveBeenLastCalledWith({
      kind: 'model_gateway_check_failed',
      message: 'A periodic model turn check failed.',
      workspaceId: 'unknown',
      errorKind: 'error',
    })
    await client.fixture.clock.advance(60_000)
    expect(check).toHaveBeenCalledTimes(5)
    expect(client.anthropic.requests).toHaveLength(1)
    expect(warn).toHaveBeenCalledTimes(5)
  } finally {
    await client.dispose()
  }
})

it('keeps an answer open after an overloaded check and logs only its kind', async () => {
  const client = await gatewayHttp(harness)
  const answer = openModelStream()
  client.anthropic.response = () => new Response(answer.body)
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  try {
    const response = await client.request()
    const check = vi
      .spyOn(client.endpoint, 'checkTurnToken')
      .mockRejectedValueOnce(
        Object.assign(new Error(`private ${client.token}`), {
          overloaded: true,
        }),
      )
    await client.fixture.clock.advance(15_000)
    expect(client.anthropic.requests[0].signal.aborted).toBe(false)
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
    ])
    await client.fixture.clock.advance(15_000)
    expect(check).toHaveBeenCalledTimes(2)
    expect(client.workspaceCalls).toHaveLength(3)
    expect(client.anthropic.requests[0].signal.aborted).toBe(false)
    answer.source.enqueue(new TextEncoder().encode('continued'))
    answer.source.close()
    expect(await response.text()).toBe('continued')
    await client.fixture.clock.advance(60_000)
    expect(check).toHaveBeenCalledTimes(2)
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
