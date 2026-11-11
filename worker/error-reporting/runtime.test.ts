import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { CloudflareClient } from '@sentry/cloudflare'

import { record } from './frames'
import {
  flushReporting,
  reportingError,
  reportingFixture,
} from './reporting.test-support'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(1_000_000)
})
afterEach(() => vi.useRealTimers())

it('sends one private SDK event and strips complete-envelope additions', async () => {
  const fixture = reportingFixture({
    client(options) {
      const client = new CloudflareClient(options)
      client.addEventProcessor((event, hint) => {
        event.message = 'private SDK message'
        event.request = { url: 'https://private.example/?token=private' }
        event.user = { id: 'private-user' }
        event.extra = { token: 'private-token' }
        event.tags = { token: 'private-token' }
        hint.attachments = [
          { filename: 'private-file', data: 'private-attachment' },
        ]
        return event
      })
      return client
    },
  })
  fixture.runtime.capture(
    {
      component: 'request',
      classification: 'request_failed',
      request: {
        method: 'GET',
        route: '/api/orgs/:param/workspaces/:param',
        ray: '0123456789abcdef-LHR',
        status: 500,
      },
    },
    reportingError(),
  )
  await flushReporting(fixture.runtime)
  expect(fixture.envelopes).toHaveLength(1)
  expect(fixture.envelopes[0][1]).toHaveLength(1)
  expect(fixture.envelopes[0][1][0][0]).toEqual({ type: 'event' })
  expect(fixture.serialized()).not.toContain('private')
  expect(fixture.envelopes[0][1][0][1]).toMatchObject({
    exception: {
      values: [{ type: 'TypeError', value: 'The Worker request failed.' }],
    },
    tags: {
      component: 'request',
      classification: 'request_failed',
      'http.route': '/api/orgs/:param/workspaces/:param',
      'http.status_code': '500',
    },
    sdk: { name: 'sentry.javascript.cloudflare', version: '11.11.0' },
  })
  expect(fixture.serialized()).not.toContain('integrations')
  expect(fixture.serialized()).not.toContain('contexts')
})

it('disables a missing or invalid DSN and emits one fixed invalid warning', async () => {
  const warnings: unknown[] = []
  const missing = reportingFixture(
    { warn: (value) => warnings.push(value) },
    '',
  )
  const invalid = reportingFixture(
    { warn: (value) => warnings.push(value) },
    'https://private-token@private.example/1',
  )
  for (const fixture of [missing, invalid]) {
    fixture.runtime.capture({
      component: 'cron',
      classification: 'cron_failed',
    })
    fixture.runtime.capture({
      component: 'cron',
      classification: 'cron_failed',
    })
    await flushReporting(fixture.runtime)
    expect(fixture.clients).toEqual([])
    expect(fixture.envelopes).toEqual([])
  }
  expect(warnings).toEqual([{ kind: 'error_tracking_dsn_invalid' }])
})

it('drops SDK fallback exceptions that bypass beforeSend', async () => {
  let failed = false
  let internalSeen = false
  const fixture = reportingFixture({
    client(options) {
      const client = new CloudflareClient(options)
      client.on('beforeSendEvent', (_event, hint) => {
        const data: unknown = hint?.data
        if (record(data) && data.__sentry__ === true) {
          internalSeen = true
          return
        }
        if (!failed) {
          failed = true
          throw new Error('private pipeline failure')
        }
      })
      return client
    },
  })
  fixture.runtime.capture({ component: 'cron', classification: 'cron_failed' })
  await flushReporting(fixture.runtime)
  expect(failed).toBe(true)
  expect(internalSeen).toBe(true)
  expect(fixture.envelopes).toEqual([])
})

it('keeps hostile getters out of the SDK and still captures a safe failure', async () => {
  for (const field of ['stack', 'constructor'] as const) {
    const hostile = new Error('private message')
    Object.defineProperty(hostile, field, {
      get() {
        throw new Error('private getter failure')
      },
    })
    const fixture = reportingFixture()
    expect(() =>
      fixture.runtime.capture(
        { component: 'workspace', classification: 'workspace_alarm_failed' },
        hostile,
      ),
    ).not.toThrow()
    await flushReporting(fixture.runtime)
    expect(fixture.envelopes).toHaveLength(1)
    expect(fixture.serialized()).not.toContain('private')
  }
})

it('drops unapproved direct SDK events, attachments, and check-ins', async () => {
  const fixture = reportingFixture()
  const client = fixture.clients[0]
  await client.sendEnvelope([
    { event_id: 'b'.repeat(32), sent_at: '2026-11-10T00:00:00Z' },
    [
      [{ type: 'event' }, { message: 'private direct event' }],
      [{ type: 'attachment', length: 7, filename: 'private' }, 'private'],
    ],
  ])
  client.captureCheckIn({ monitorSlug: 'private', status: 'ok' })
  await flushReporting(fixture.runtime)
  expect(fixture.envelopes).toEqual([])
})

it('does not throw when report construction or delivery fails', async () => {
  const failure = new Error('private transport failure')
  expect(() =>
    reportingFixture({
      client() {
        throw failure
      },
    }),
  ).not.toThrow()
  const fixture = reportingFixture({
    transport: () => ({
      send() {
        throw failure
      },
      flush() {
        throw failure
      },
    }),
  })
  expect(() =>
    fixture.runtime.capture({
      component: 'cron',
      classification: 'cron_failed',
    }),
  ).not.toThrow()
  await expect(flushReporting(fixture.runtime)).resolves.toBeUndefined()
  expect(fixture.envelopes).toEqual([])
})

it('does not parse multiline error text as stack frames', async () => {
  const fixture = reportingFixture()
  const error = new Error('private text\n    at privateToken (index.js:1:2)')
  fixture.runtime.capture(
    { component: 'cron', classification: 'cron_failed' },
    error,
  )
  await flushReporting(fixture.runtime)
  expect(fixture.envelopes).toHaveLength(1)
  expect(fixture.serialized()).not.toContain('privateToken')
})

it('keeps the verified diagnostic through early and late SDK frame mutation', async () => {
  const fixture = reportingFixture({
    client(options) {
      const client = new CloudflareClient(options)
      client.addEventProcessor((event) => {
        event.exception?.values?.[0].stacktrace?.frames?.push({
          filename: '/index.js',
          function: 'privateEarlyFrame',
          lineno: 1,
        })
        return event
      })
      client.on('beforeSendEvent', (event) => {
        event.exception = {
          values: [
            {
              type: 'privateLateType',
              stacktrace: {
                frames: [
                  {
                    filename: '/index.js',
                    function: 'privateLateFrame',
                    lineno: 2,
                  },
                ],
              },
            },
          ],
        }
      })
      return client
    },
  })
  fixture.runtime.capture(
    { component: 'cron', classification: 'cron_failed' },
    reportingError(),
  )
  await flushReporting(fixture.runtime)
  expect(fixture.envelopes).toHaveLength(1)
  expect(fixture.serialized()).not.toContain('private')
  expect(fixture.envelopes[0][1][0][1]).toMatchObject({
    exception: {
      values: [
        { type: 'TypeError', stacktrace: { frames: [{ function: 'fail' }] } },
      ],
    },
  })
})
