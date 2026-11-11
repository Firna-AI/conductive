import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import {
  flushReporting,
  reportingError,
  reportingFixture,
} from './reporting.test-support'
import { captureWorkerFailure, withWorkerErrorScope } from './scope'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(1_000_000)
})
afterEach(() => vi.useRealTimers())

it('isolates interleaved request metadata and a later workspace callback', async () => {
  const first = reportingFixture()
  const second = reportingFixture()
  let release = () => {}
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  const pending = withWorkerErrorScope(
    first.runtime,
    {
      component: 'request',
      request: { method: 'GET', route: '/api/models', status: 500 },
    },
    async () => {
      await held
      captureWorkerFailure('request_failed', reportingError())
    },
  )
  withWorkerErrorScope(
    second.runtime,
    {
      component: 'request',
      request: { method: 'POST', route: '/api/orgs', status: 503 },
    },
    () => captureWorkerFailure('request_failed', reportingError()),
  )
  release()
  await pending
  withWorkerErrorScope(first.runtime, { component: 'workspace' }, () =>
    captureWorkerFailure('runner_message_failed', reportingError()),
  )
  await flushReporting(first.runtime)
  await flushReporting(second.runtime)
  expect(first.envelopes).toHaveLength(2)
  expect(second.envelopes).toHaveLength(1)
  expect(first.envelopes[0][1][0][1]).toMatchObject({
    tags: {
      component: 'request',
      'http.method': 'GET',
      'http.route': '/api/models',
    },
  })
  expect(second.envelopes[0][1][0][1]).toMatchObject({
    tags: {
      component: 'request',
      'http.method': 'POST',
      'http.route': '/api/orgs',
    },
  })
  expect(first.envelopes[1][1][0][1]).toMatchObject({
    tags: { component: 'workspace', classification: 'runner_message_failed' },
  })
  expect(JSON.stringify(first.envelopes[1])).not.toContain('http.')
})
