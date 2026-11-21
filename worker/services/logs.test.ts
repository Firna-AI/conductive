import { afterEach, beforeAll, expect, it } from 'vitest'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import { record, string } from '../chat/inputs'
import { closeSockets } from '../chat/adapter-sockets.test-support'
import {
  observed,
  servicesFixture,
  snapshot,
  type ServicesFixture,
} from './fixture.test-support'

let bundle: string
let fixture: ServicesFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})
afterEach(async () => {
  await fixture?.dispose()
})

it('filters complete raw logs before line and UTF-8 tail cuts and keeps rotation omission across split JSON escapes', async () => {
  const active = (fixture = await servicesFixture(bundle))
  await active.secret('secret-value')
  const runner = await active.connect()
  runner.document('services.report.part', 'report', snapshot)
  await runner.fence()
  const request = { requestId: 'browser-log', target: observed }
  const response = active.post(active.paths.logs, request)
  const command = record(await runner.inbox.next())
  expect(command.type).toBe('services.logs')
  const runnerRequest = record(command.request)
  expect(runnerRequest.requestId).not.toBe(request.requestId)
  const raw = {
    request: runnerRequest,
    result: {
      state: 'ready',
      text: `${'old\n'.repeat(210)}secret-value${'😀'.repeat(16383)}`,
      omitted: true,
    },
  }
  const source = JSON.stringify(raw).replace(
    'secret-value',
    'secr\\u0065t-value',
  )
  const escape = source.indexOf('\\u0065')
  runner.document(
    'services.logs.part',
    string(runnerRequest.requestId),
    raw,
    [escape + 3, escape + 8],
    source,
  )
  expect(await (await response).json()).toEqual({
    request,
    result: {
      state: 'ready',
      text: `ted]${'😀'.repeat(16383)}`,
      omitted: true,
    },
  })
  expect(JSON.stringify([...(await active.state())])).not.toContain(
    'secret-value',
  )
  expect(JSON.stringify([...(await active.state())])).not.toContain('old\\n')

  const lines = active.post(active.paths.logs, request)
  const lineRequest = record(record(await runner.inbox.next()).request)
  runner.document('services.logs.part', string(lineRequest.requestId), {
    request: lineRequest,
    result: { state: 'ready', text: 'line\n'.repeat(201), omitted: false },
  })
  expect(await (await lines).json()).toEqual({
    request,
    result: { state: 'ready', text: 'line\n'.repeat(200), omitted: true },
  })

  const unicode = active.post(active.paths.logs, request)
  const unicodeRequest = record(record(await runner.inbox.next()).request)
  runner.document('services.logs.part', string(unicodeRequest.requestId), {
    request: unicodeRequest,
    result: { state: 'ready', text: `${'😀'.repeat(16385)}a`, omitted: false },
  })
  expect(await (await unicode).json()).toEqual({
    request,
    result: { state: 'ready', text: `${'😀'.repeat(16383)}a`, omitted: true },
  })
})

it('serializes raw reads, uses a fresh runner ID for the same browser ID, and filters each reload with current allowed values', async () => {
  const active = (fixture = await servicesFixture(bundle))
  const runner = await active.connect()
  runner.document('services.report.part', 'report', snapshot)
  await runner.fence()
  const request = { requestId: 'same-browser-id', target: observed }
  const first = active.post(active.paths.logs, request)
  const firstRequest = record(record(await runner.inbox.next()).request)
  const second = active.post(active.paths.logs, request)
  await runner.fence()
  expect(
    runner.inbox.received.filter(
      (value) => record(value).type === 'services.logs',
    ),
  ).toHaveLength(1)
  runner.document('services.logs.part', string(firstRequest.requestId), {
    request: firstRequest,
    result: { state: 'ready', text: 'new-secret', omitted: false },
  })
  expect(await (await first).json()).toEqual({
    request,
    result: { state: 'ready', text: 'new-secret', omitted: false },
  })
  const secondRequest = record(record(await runner.inbox.next()).request)
  expect(secondRequest.requestId).not.toBe(firstRequest.requestId)
  await active.secret('new-secret')
  runner.document('services.logs.part', string(firstRequest.requestId), {
    request: firstRequest,
    result: { state: 'ready', text: 'late old log', omitted: false },
  })
  runner.document('services.logs.part', string(secondRequest.requestId), {
    request: secondRequest,
    result: { state: 'ready', text: 'new-secret', omitted: false },
  })
  expect(await (await second).json()).toEqual({
    request,
    result: { state: 'ready', text: '[redacted]', omitted: false },
  })
})

it('returns explicit stale, missing, filtered failure, and unavailable outcomes without storing raw replies', async () => {
  const active = (fixture = await servicesFixture(bundle))
  await active.secret('log-secret')
  const runner = await active.connect()
  runner.document('services.report.part', 'report', snapshot)
  await runner.fence()
  const request = { requestId: 'log-result', target: observed }
  for (const result of [
    { state: 'stale' },
    { state: 'not_found' },
    { state: 'failed', error: { code: 'read_failed', message: 'log-secret' } },
  ]) {
    const response = active.post(active.paths.logs, request)
    const runnerRequest = record(record(await runner.inbox.next()).request)
    runner.document('services.logs.part', string(runnerRequest.requestId), {
      request: runnerRequest,
      result,
    })
    expect(await (await response).json()).toEqual({
      request,
      result:
        result.state === 'failed'
          ? {
              state: 'failed',
              error: { code: 'read_failed', message: '[redacted]' },
            }
          : result,
    })
  }
  const pending = active.post(active.paths.logs, request)
  expect(record(await runner.inbox.next()).type).toBe('services.logs')
  await closeSockets(runner.socket)
  expect(await (await pending).json()).toEqual({
    request,
    result: { state: 'unavailable' },
  })
  expect(await (await active.post(active.paths.logs, request)).json()).toEqual({
    request,
    result: { state: 'unavailable' },
  })
  expect(JSON.stringify([...(await active.state())])).not.toContain(
    'log-secret',
  )
})
