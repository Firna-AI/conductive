// @vitest-environment happy-dom
import { captureException, flush } from '@sentry/react'
import { expect, it, vi } from 'vitest'

import {
  browserClient,
  browserDsn,
  browserFailure,
  browserRelease,
  browserReporter,
  bundleAddress,
  registerBrowserBundle,
  sentEvent,
} from './error-reporting.test-support'

it('starts only for configured production web and Mac builds while keeping disabled React defaults', async () => {
  registerBrowserBundle()
  const build = { production: true, dsn: browserDsn, release: browserRelease }
  const target = {
    location: { origin: 'https://app.conductive.build' },
    navigator: { userAgent: '' },
  }
  for (const change of [
    { build: { ...build, production: false } },
    { build: { ...build, dsn: '' } },
    { build: { ...build, dsn: 'https://private.example/error' } },
    { build: { ...build, release: undefined } },
    { build: { ...build, release: 'private-release' } },
    { target: { ...target, location: { origin: 'http://127.0.0.1:5174' } } },
    {
      platform: 'mac',
      appOrigin: 'http://127.0.0.1:5174',
      target: { ...target, location: { origin: 'conductive-app://desktop' } },
    },
  ] as const) {
    const { reporting, sent } = browserReporter(change)
    expect(reporting.rootOptions).toBeUndefined()
    captureException(browserFailure())
    await flush()
    expect(sent).toEqual([])
    await reporting.close()
  }
  const web = browserReporter()
  captureException(browserFailure())
  await flush()
  expect(web.sent).toHaveLength(1)
  expect(web.reporting.rootOptions).toEqual({
    onUncaughtError: expect.any(Function),
    onCaughtError: expect.any(Function),
    onRecoverableError: expect.any(Function),
  })
  await web.reporting.close()

  const macAddress = 'conductive-app://desktop/assets/index-mac123.js'
  registerBrowserBundle(macAddress)
  const mac = browserReporter({
    platform: 'mac',
    appOrigin: 'https://app.conductive.build',
    target: { ...target, location: { origin: 'conductive-app://desktop' } },
  })
  captureException(browserFailure('private-mac-error', macAddress))
  await flush()
  expect(mac.sent).toHaveLength(1)
  expect(sentEvent(mac.sent[0]).event).toMatchObject({
    tags: { platform: 'mac' },
    exception: {
      values: [
        {
          stacktrace: {
            frames: [
              {
                filename: 'index-mac123.js',
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
  await mac.reporting.close()
})

it('reports each React root callback and both installed global error channels with fixed classifications', async () => {
  registerBrowserBundle()
  const { reporting, sent } = browserReporter()
  reporting.rootOptions?.onUncaughtError?.(browserFailure('uncaught'), {
    componentStack: 'private-component-stack',
  })
  reporting.rootOptions?.onCaughtError?.(browserFailure('caught'), {
    componentStack: 'private-component-stack',
  })
  reporting.rootOptions?.onRecoverableError?.(browserFailure('recoverable'), {
    componentStack: 'private-component-stack',
  })
  window.onerror?.(
    'private-global-message',
    bundleAddress,
    152,
    37,
    browserFailure('global'),
  )
  const rejection = Object.assign(new Event('unhandledrejection'), {
    promise: Promise.resolve(),
    reason: browserFailure('promise'),
  })
  window.onunhandledrejection?.(rejection)
  await flush()
  expect(sent).toHaveLength(5)
  const expected = [
    ['react-uncaught', 'React reported an uncaught error.'],
    ['react-caught', 'React reported a caught error.'],
    ['react-recoverable', 'React reported a recoverable error.'],
    ['uncaught-error', 'The page reported an uncaught error.'],
    [
      'unhandled-rejection',
      'The page reported an unhandled promise rejection.',
    ],
  ]
  for (const [index, [classification, value]] of expected.entries()) {
    expect(sentEvent(sent[index]).event).toMatchObject({
      tags: { classification },
      exception: { values: [{ type: 'TypeError', value }] },
    })
  }
  expect(String(sent.map((request) => request.init.body))).not.toContain(
    'private-',
  )
  await reporting.close()
})

it('keeps startup, delivery, capture, and close failures inside the reporter', async () => {
  const failed = browserReporter({
    transport: () => {
      throw new Error('private-startup-failure')
    },
  })
  expect(failed.reporting.rootOptions).toBeUndefined()
  await expect(failed.reporting.close()).resolves.toBe(true)

  const { reporting, sent } = browserReporter({
    transport: () => ({
      send: () => Promise.reject(new Error('private-delivery-failure')),
      flush: () => Promise.resolve(true),
    }),
  })
  expect(() =>
    reporting.rootOptions?.onUncaughtError?.(browserFailure(), {}),
  ).not.toThrow()
  await expect(flush()).resolves.toBe(true)
  expect(sent).toEqual([])
  const client = browserClient()
  vi.spyOn(client, 'captureException').mockImplementation(() => {
    throw new Error('private-capture-failure')
  })
  expect(() =>
    reporting.rootOptions?.onCaughtError?.(browserFailure(), {}),
  ).not.toThrow()
  vi.spyOn(client, 'close').mockRejectedValue(
    new Error('private-close-failure'),
  )
  await expect(reporting.close()).resolves.toBe(false)
  expect(() => reporting.identity.setUser('after-close')).not.toThrow()
})
