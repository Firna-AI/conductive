import { afterEach, expect, it, vi } from 'vitest'

import { FakeModelUpstream } from '../test-support/fake-model-upstream'
import { readEndpointModelsForSave } from './endpoint-model-save'
import { deferred } from './http.test-support'

afterEach(() => vi.useRealTimers())

it('ends a save read with no HTTP answer at one timeout without a second fetch', async () => {
  vi.useFakeTimers()
  const fake = new FakeModelUpstream(
    'https://proxy.example.test',
    ['/models', '/v1/models'],
    () => Response.json({ data: [] }),
    'GET',
  )
  const started = deferred<void>()
  fake.responseFactories.push(() => {
    started.resolve()
    return new Promise<Response>(() => undefined)
  })
  const endpoint = 'https://proxy.example.test'
  let settled = false
  const result = readEndpointModelsForSave(
    { agent: 'codex', kind: 'endpoint', endpoint, secret: 'fake-key' },
    fake.fetch,
  ).then((value) => {
    settled = true
    return value
  })
  await started.promise
  await vi.advanceTimersByTimeAsync(9_999)
  expect(settled).toBe(false)
  await vi.advanceTimersByTimeAsync(1)
  expect(await result).toEqual({ endpoint, ids: null, endpointV1Added: false })
  expect(fake.requests).toHaveLength(1)
  expect(fake.requests[0].signal.aborted).toBe(true)
})
