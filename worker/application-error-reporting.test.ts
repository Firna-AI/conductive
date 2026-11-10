import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { createApp } from './application'
import { reportingEnvironment } from './error-reporting/environment.test-support'
import {
  runWorkerCron,
  runWorkspaceAlarm,
  workerFetchEntry,
} from './error-reporting/entry'
import {
  flushReporting,
  reportingError,
  reportingFixture,
} from './error-reporting/reporting.test-support'
import { errorResponse, HttpError } from './http'
import { requestBodyEntry } from './http/request-body'
import type { WorkerErrorRuntime } from './error-reporting/runtime'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(1_000_000)
})
afterEach(() => vi.useRealTimers())

it('reports final unknown and known request errors once and leaves 4xx silent', async () => {
  for (const error of [
    reportingError(),
    new HttpError(503, 'service_unavailable', 'private message'),
  ]) {
    const fixture = reportingFixture()
    const env = reportingEnvironment()
    env.ASSETS = {
      async fetch() {
        throw error
      },
    }
    const app = createApp({ errorReporting: fixture.runtime })
    const response = await app.fetch(
      new Request(`${env.APP_ORIGIN}/private?token=private`),
      env,
    )
    expect(response.status).toBe(error instanceof HttpError ? 503 : 500)
    await flushReporting(fixture.runtime)
    expect(fixture.envelopes).toHaveLength(1)
    expect(fixture.serialized()).not.toContain('private')
  }
  const fixture = reportingFixture()
  const response = await createApp({ errorReporting: fixture.runtime }).fetch(
    new Request('https://forbidden.test/private?token=private'),
    reportingEnvironment(),
  )
  expect(response.status).toBe(403)
  await flushReporting(fixture.runtime)
  expect(fixture.envelopes).toEqual([])
})

it('reports returned 5xx from early returns on every host and method surface', async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  try {
    for (const [address, method, status] of [
      ['https://app.conductive.build/private', 'GET', 503],
      ['https://app.conductive.build/private', 'HEAD', 503],
      ['https://app.conductive.build/private', 'OPTIONS', 503],
      ['https://conductive.build/', 'GET', 503],
      ['https://api.conductive.build/private', 'GET', 501],
      [
        'https://0123456789abcdef0123456789abcdef.conductive.page/private',
        'GET',
        500,
      ],
    ] as const) {
      const fixture = reportingFixture()
      const env = reportingEnvironment()
      env.ASSETS = { fetch: async () => new Response(null, { status: 503 }) }
      if (address === 'https://conductive.build/') env.ASSETS = undefined
      const response = await createApp({
        errorReporting: fixture.runtime,
      }).fetch(
        new Request(address, { method, headers: { Origin: env.APP_ORIGIN } }),
        env,
      )
      expect(response.status, `${method} ${address}`).toBe(status)
      await flushReporting(fixture.runtime)
      expect(fixture.envelopes, `${method} ${address}`).toHaveLength(1)
    }
  } finally {
    vi.restoreAllMocks()
  }
})

it('waits for the request body override and emits no report for its final 413', async () => {
  const fixture = reportingFixture()
  const handle = workerFetchEntry(
    requestBodyEntry(async (request) => {
      try {
        await request.arrayBuffer()
      } catch {
        return errorResponse(reportingError())
      }
      return new Response(null, { status: 503 })
    }),
    {
      fetch,
      now: () => 1_000_000,
      randomToken: () => 'unused',
      errorReporting: fixture.runtime,
    },
  )
  const response = await handle(
    new Request('https://app.conductive.build/private', {
      method: 'POST',
      body: new Uint8Array(1_000_001),
    }),
    reportingEnvironment(),
  )
  expect(response.status).toBe(413)
  await flushReporting(fixture.runtime)
  expect(fixture.envelopes).toEqual([])
})

it('reports failed alarms and cron runs and rethrows the same error', async () => {
  for (const run of [runWorkspaceAlarm, runWorkerCron]) {
    const fixture = reportingFixture()
    const original = reportingError()
    await expect(
      run(fixture.runtime, async () => {
        throw original
      }),
    ).rejects.toBe(original)
    await flushReporting(fixture.runtime)
    expect(fixture.envelopes).toHaveLength(1)
  }
})

it('preserves the exact response when the reporting transport fails', async () => {
  let attempts = 0
  const fixture = reportingFixture({
    transport: () => ({
      send() {
        attempts++
        throw reportingError()
      },
      flush: async () => false,
    }),
  })
  const reporting: WorkerErrorRuntime = {
    capture(input, error) {
      fixture.runtime.capture(input, error)
      throw reportingError()
    },
    diagnostic(input, diagnostic) {
      fixture.runtime.diagnostic(input, diagnostic)
      throw reportingError()
    },
    flush: async () => {
      throw reportingError()
    },
  }
  const env = reportingEnvironment()
  env.ASSETS = {
    fetch: async () =>
      new Response('original body', {
        status: 503,
        headers: { 'X-Original': 'yes' },
      }),
  }
  const pending = createApp({ errorReporting: reporting }).fetch(
    new Request(`${env.APP_ORIGIN}/private`),
    env,
  )
  await expect(pending).resolves.toBeInstanceOf(Response)
  const response = await pending
  expect(response.status).toBe(503)
  expect(response.headers.get('X-Original')).toBe('yes')
  expect(await response.text()).toBe('original body')
  await flushReporting(fixture.runtime)
  expect(attempts).toBe(1)
})

it('reports a failed production scheduled entry and rethrows its original error', async () => {
  const fixture = reportingFixture()
  const original = reportingError()
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
  try {
    await expect(
      createApp({ errorReporting: fixture.runtime }).scheduled(
        {
          cron: '*/15 * * * *',
          scheduledTime: 0,
          noRetry() {},
        },
        reportingEnvironment(original),
      ),
    ).rejects.toBe(original)
    await flushReporting(fixture.runtime)
    expect(fixture.envelopes).toHaveLength(1)
    expect(fixture.envelopes[0][1][0][1]).toMatchObject({
      tags: { component: 'cron' },
    })
    expect(fixture.serialized()).not.toContain('private')
  } finally {
    warning.mockRestore()
  }
})
