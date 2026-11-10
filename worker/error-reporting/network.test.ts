import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import {
  flushReporting,
  reportingError,
  reportingFixture,
} from './reporting.test-support'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(1_000_000)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

it('uses the checked ingest host without redirect forwarding and releases its response', async () => {
  const requests: { address: unknown; init?: RequestInit }[] = []
  let cancelled = 0
  vi.stubGlobal('fetch', async (address: unknown, init?: RequestInit) => {
    requests.push({ address, init })
    return new Response(
      new ReadableStream({
        cancel() {
          cancelled++
        },
      }),
      {
        status: 307,
        headers: { Location: 'https://must-not-follow.invalid' },
      },
    )
  })
  const fixture = reportingFixture({ transport: undefined })
  fixture.runtime.capture(
    { component: 'cron', classification: 'cron_failed' },
    reportingError(),
  )
  await flushReporting(fixture.runtime)
  expect(requests).toHaveLength(1)
  expect(requests[0].init?.redirect).toBe('manual')
  expect(requests[0].init?.method).toBe('POST')
  expect(String(requests[0].address)).toMatch(
    /^https:\/\/s1\.eu-nbg-2\.betterstackdata\.com\/api\/1\/envelope\//,
  )
  expect(String(requests[0].init?.body)).not.toContain('private')
  expect(cancelled).toBe(1)
})
