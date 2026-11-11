// @vitest-environment happy-dom
import {
  captureEvent,
  captureException,
  captureSession,
  flush,
  logger,
  metrics,
  startSession,
  addBreadcrumb,
} from '@sentry/react'
import { expect, it, vi } from 'vitest'
import type { ErrorEvent } from '@sentry/core'

import {
  browserClient,
  browserFailure,
  browserReporter,
  bundleAddress,
  registerBrowserBundle,
  sentEvent,
} from './error-reporting.test-support'

it('drops internal fallback events, direct envelopes, reused approvals, and all auxiliary telemetry', async () => {
  registerBrowserBundle()
  const storageRead = vi.spyOn(Storage.prototype, 'getItem')
  const storageWrite = vi.spyOn(Storage.prototype, 'setItem')
  const { reporting, sent } = browserReporter()
  const client = browserClient()
  captureException(browserFailure('private-internal'), {
    data: { __sentry__: true },
  })
  let failProcessor = true
  client.addEventProcessor((event) => {
    if (failProcessor) {
      failProcessor = false
      throw new Error('private-processor-failure')
    }
    return event
  })
  captureException(browserFailure('private-failed-processing'))
  const raw = {
    exception: { values: [{ type: 'Error', value: 'private-direct' }] },
  }
  await client.sendEnvelope([
    {
      event_id: '11111111111111111111111111111111',
      sent_at: '2023-11-14T22:13:20.000Z',
      private: 'private-header',
    },
    [[{ type: 'event' }, raw]],
  ])
  logger.error('private-log')
  metrics.count('private_metric', 1)
  startSession()
  captureSession()
  addBreadcrumb({ message: 'private-breadcrumb' })
  await flush()
  expect(sent).toEqual([])
  expect(storageRead).not.toHaveBeenCalled()
  expect(storageWrite).not.toHaveBeenCalled()

  let sentEnvelope: Parameters<typeof client.sendEnvelope>[0] | undefined
  client.on('beforeEnvelope', (envelope) => {
    sentEnvelope = envelope
  })
  captureException(browserFailure())
  await flush()
  expect(sent).toHaveLength(1)
  expect(sentEnvelope).toBeInstanceOf(Array)
  if (!sentEnvelope) throw new Error('Expected the SDK envelope.')
  await client.sendEnvelope(sentEnvelope)
  expect(sent).toHaveLength(1)
  expect(String(sent[0].init.body)).not.toContain('private-')
  await reporting.close()
})

it('saves trusted identity, route, exception, and frame snapshots before later SDK hooks mutate the event', async () => {
  registerBrowserBundle()
  const { reporting, sent, navigation } = browserReporter()
  const client = browserClient()
  reporting.identity.setUser('first-user')
  const stop = client.on('beforeSendEvent', (event) => {
    event.user = { id: 'private-user', username: 'private-login' }
    event.tags = {
      screen: '/private-path',
      classification: 'private-classification',
    }
    const first = event.exception?.values?.[0]
    if (first) {
      first.type = 'PrivateType'
      first.value = 'private-message'
      first.stacktrace = {
        frames: [
          {
            filename: bundleAddress,
            function: 'privateLateFrame',
            lineno: 999,
            colno: 888,
          },
        ],
      }
    }
    navigation.push('/join/private-code?private-query=1')
    reporting.identity.setUser('second-user')
  })
  client.on('beforeEnvelope', (envelope) => {
    envelope[0].private = 'private-header'
    envelope[0].trace = { transaction: 'private-transaction' }
  })
  captureException(browserFailure())
  await flush()
  expect(sent).toHaveLength(1)
  expect(sentEvent(sent[0]).event).toMatchObject({
    user: { id: 'first-user' },
    tags: {
      platform: 'web',
      classification: 'unexpected-error',
      screen: 'workspace',
    },
    exception: {
      values: [
        {
          type: 'TypeError',
          value: 'The app reported an unexpected error.',
          stacktrace: {
            frames: [
              {
                filename: 'index-real123.js',
                function: 'renderWorkspace',
                lineno: 152,
                colno: 37,
                in_app: true,
              },
            ],
          },
        },
      ],
    },
  })
  expect(String(sent[0].init.body)).not.toContain('private')
  stop()
  navigation.replace('/operator/users/7654321?q=private-search')
  captureException(browserFailure())
  await flush()
  expect(sentEvent(sent[1]).event).toMatchObject({
    user: { id: 'second-user' },
    tags: { screen: 'operator' },
  })
  expect(String(sent[1].init.body)).not.toContain('private')
  await reporting.close()
})

it('rejects an approved event when a later SDK hook changes its event ID', async () => {
  registerBrowserBundle()
  const { reporting, sent } = browserReporter()
  browserClient().on('beforeSendEvent', (event) => {
    event.event_id = '22222222222222222222222222222222'
  })
  captureException(browserFailure())
  await flush()
  expect(sent).toEqual([])
  await reporting.close()
})

it('drops unverified original frames while keeping a safe class and an idempotent filter', async () => {
  registerBrowserBundle()
  const { reporting, sent } = browserReporter()
  const error = browserFailure()
  Object.defineProperty(error, 'stack', {
    value: `TypeError: changed-header\n    at privateFake (${bundleAddress}:999:888)`,
  })
  captureException(error)
  const event: ErrorEvent = {
    type: undefined,
    event_id: '33333333333333333333333333333333',
    exception: {
      values: [
        {
          type: 'private / type',
          value: 'private-message',
          stacktrace: {
            frames: [{ filename: bundleAddress, function: 'privateFake' }],
          },
        },
      ],
    },
  }
  captureEvent(event)
  const unknownBundle =
    'https://app.conductive.build/assets/private-unloaded.js'
  captureEvent(
    {
      exception: { values: [{ type: 'TypeError', value: 'private-message' }] },
      debug_meta: {
        images: [
          {
            type: 'sourcemap',
            code_file: unknownBundle,
            debug_id: '6f5287e1-35fc-45c3-84fe-b7ae90046d00',
          },
        ],
      },
    },
    { originalException: browserFailure('private-unloaded', unknownBundle) },
  )
  let messageReads = 0
  const getterError = browserFailure()
  Object.defineProperty(getterError, 'message', {
    get() {
      messageReads += 1
      throw new Error('private-getter')
    },
  })
  captureEvent(
    {
      exception: { values: [{ type: 'TypeError', value: 'private-message' }] },
    },
    { originalException: getterError },
  )
  await flush()
  expect(sent).toHaveLength(4)
  expect(sentEvent(sent[0]).event).toMatchObject({
    exception: {
      values: [
        { type: 'TypeError', value: 'The app reported an unexpected error.' },
      ],
    },
  })
  expect(sentEvent(sent[0]).event).not.toHaveProperty('debug_meta')
  expect(sentEvent(sent[1]).event).toMatchObject({
    exception: {
      values: [
        { type: 'Error', value: 'The app reported an unexpected error.' },
      ],
    },
  })
  expect(sentEvent(sent[2]).event).not.toHaveProperty('debug_meta')
  expect(sentEvent(sent[3]).event).not.toHaveProperty('debug_meta')
  expect(messageReads).toBe(0)
  expect(String(sent.map((request) => request.init.body))).not.toContain(
    'private',
  )

  const filter = browserClient().getOptions().beforeSend
  expect(filter).toBeTypeOf('function')
  if (!filter) throw new Error('Expected the final SDK filter.')
  const first = await filter(event, {})
  expect(first).not.toBeNull()
  if (!first) throw new Error('Expected the rebuilt event.')
  expect(await filter(first, {})).toEqual(first)
  const framed = await filter(event, { originalException: browserFailure() })
  expect(framed?.debug_meta?.images).toHaveLength(1)
  if (!framed) throw new Error('Expected the verified-frame event.')
  expect(await filter(framed, {})).toEqual(framed)
  const hostile = { ...event }
  Object.defineProperty(hostile, 'exception', {
    get() {
      throw new Error('private-event-getter')
    },
  })
  await expect(
    Promise.resolve().then(() => filter(hostile, {})),
  ).resolves.toBeNull()
  await reporting.close()
})
