import { generateKeyPairSync } from 'node:crypto'

import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest'

import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../../test-support/harness'
import { createGitHubImageSourceMaterializer } from './materialize'
import { sourceFixture } from './test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
afterAll(async () => {
  await harness.dispose()
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

it('renews a builder during a slow source transfer and stops renewals after preparation', async () => {
  const keys = generateKeyPairSync('rsa', { modulusLength: 2048 })
  const key = keys.privateKey
    .export({ type: 'pkcs1', format: 'pem' })
    .toString()
  const fixture = await sourceFixture(harness, key)
  const started = deferred()
  const resume = deferred()
  vi.spyOn(Date, 'now').mockReturnValue(TEST_TIME)
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  const preparing = createGitHubImageSourceMaterializer(fixture.env, {
    fetch: async (request) => {
      if (new URL(request.url).pathname.endsWith('/git-upload-pack')) {
        started.resolve()
        await resume.promise
      }
      return fixture.fetch(request)
    },
  })(fixture.input)
  const renewals = () =>
    Promise.all(
      harness.boat.requests
        .filter((request) => request.method === 'PATCH')
        .map(async (request) => {
          const value: unknown = await request.clone().json()
          return value
        }),
    )
  try {
    await started.promise
    await vi.advanceTimersByTimeAsync(1_800_000)
    expect(await renewals()).toEqual(
      Array.from({ length: 6 }, () => ({ ttlSeconds: 1800 })),
    )
  } finally {
    resume.resolve()
    await preparing
  }
  await vi.advanceTimersByTimeAsync(300_000)
  expect(await renewals()).toHaveLength(6)
})

function deferred() {
  let resolve: () => void = () => {
    throw new Error('Deferred operation is not ready')
  }
  const promise = new Promise<void>((complete) => {
    resolve = complete
  })
  return { promise, resolve: () => resolve() }
}
