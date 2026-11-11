// @vitest-environment happy-dom
import { expect, it } from 'vitest'
import { captureException, flush } from '@sentry/react'

import {
  browserFailure,
  browserRelease,
  browserReporter,
  browserTime,
  bundleDebugId,
  registerBrowserBundle,
  sentEvent,
} from './error-reporting.test-support'

it('sends only approved browser fields through the complete serialized SDK envelope', async () => {
  registerBrowserBundle()
  const { reporting, sent } = browserReporter()
  reporting.identity.setUser('conductive-user')
  captureException(browserFailure(), {
    attachments: [{ filename: 'private-file.txt', data: 'private-content' }],
    captureContext: {
      user: { id: 'forged-user', email: 'private@example.com' },
      tags: { screen: '/private-address', secret: 'private-tag' },
      extra: { private: 'private-extra' },
      contexts: { device: { name: 'private-device' } },
    },
  })
  await flush()
  expect(sent).toHaveLength(1)
  const { headers, items, event } = sentEvent(sent[0])
  expect(headers).toEqual({
    event_id: expect.stringMatching(/^[a-f0-9]{32}$/),
    sent_at: '2023-11-14T22:13:20.000Z',
  })
  expect(items).toHaveLength(1)
  expect(items[0][0]).toEqual({ type: 'event' })
  expect(event).toEqual({
    event_id: headers.event_id,
    timestamp: browserTime / 1000,
    platform: 'javascript',
    environment: 'production',
    release: browserRelease,
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
    debug_meta: {
      images: [
        {
          type: 'sourcemap',
          code_file: 'index-real123.js',
          debug_id: bundleDebugId,
        },
      ],
    },
    contexts: {
      browser: { name: 'Chrome', version: '130.0.0.0' },
      os: { name: 'macOS', version: '14.5' },
    },
    tags: {
      platform: 'web',
      classification: 'unexpected-error',
      screen: 'workspace',
    },
    user: { id: 'conductive-user' },
  })
  expect(JSON.stringify(sent[0].init.body)).not.toContain('private-')
  expect(sent[0].init).toMatchObject({
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    cache: 'no-store',
    redirect: 'error',
  })
  await reporting.close()
})

it('keeps actual bundle locations while excluding fake frames inside a multiline message', async () => {
  registerBrowserBundle()
  const { reporting, sent } = browserReporter()
  const message =
    'private-message\n    at privateMessageSecret (https://app.conductive.build/assets/index-real123.js:999:888)'
  captureException(browserFailure(message))
  await flush()
  expect(sent).toHaveLength(1)
  expect(sentEvent(sent[0]).event).toMatchObject({
    exception: {
      values: [
        {
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
  expect(String(sent[0].init.body)).not.toContain('privateMessageSecret')
  await reporting.close()
})
