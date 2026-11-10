// @vitest-environment happy-dom
import { captureException, flush } from '@sentry/react'
import { expect, it } from 'vitest'

import {
  browserFailure,
  browserReporter,
  bundleAddress,
  registerBrowserBundle,
  sentEvent,
} from './error-reporting.test-support'

it('permits headerless original stacks only after a fresh native host probe and rejects message lines there', async () => {
  registerBrowserBundle()
  const native = browserReporter()
  const headerless = browserFailure('private-headerless')
  Object.defineProperty(headerless, 'stack', {
    value: `renderWorkspace@${bundleAddress}:152:37\n`,
  })
  captureException(headerless)
  await flush()
  expect(sentEvent(native.sent[0]).event).not.toHaveProperty('debug_meta')
  await native.reporting.close()

  const { reporting, sent } = browserReporter({
    createProbeError: (message) => {
      const probe = new Error(message)
      Object.defineProperty(probe, 'stack', {
        value: `probe@${bundleAddress}:1:1\n`,
      })
      return probe
    },
  })
  const original = browserFailure('private-headerless')
  Object.defineProperty(original, 'stack', {
    value: `renderWorkspace@${bundleAddress}:152:37\n`,
  })
  captureException(original)
  const message = `private-message\nprivateMessageSecret@${bundleAddress}:999:888`
  const forged = browserFailure(message)
  Object.defineProperty(forged, 'stack', {
    value: `privateMessageSecret@${bundleAddress}:999:888\nrenderWorkspace@${bundleAddress}:152:37\n`,
  })
  captureException(forged)
  await flush()
  expect(sent).toHaveLength(2)
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
  expect(sentEvent(sent[1]).event).not.toHaveProperty('debug_meta')
  expect(String(sent.map((request) => request.init.body))).not.toContain(
    'private',
  )
  await reporting.close()
})
