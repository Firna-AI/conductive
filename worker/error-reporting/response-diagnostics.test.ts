import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { workspacePath } from '../../src/shared/workspaces'
import { responseDiagnostic } from './causes'
import { workerFetchEntry } from './entry'
import { reportingEnvironment } from './environment.test-support'
import { flushReporting, reportingFixture } from './reporting.test-support'
import {
  consumeWorkspaceDiagnosticResponse,
  WORKER_ERROR_DIAGNOSTIC_HEADER,
  workspaceDiagnosticResponse,
} from './response-diagnostics'
import { errorResponse, HttpError } from '../http'
import { requestBodyEntry } from '../http/request-body'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(1_000_000)
})
afterEach(() => vi.useRealTimers())

function request(body?: Uint8Array<ArrayBuffer>): Request {
  const path = workspacePath('private-org', 'private-workspace')
  return new Request(`https://app.conductive.build${path}?token=private`, {
    method: body ? 'POST' : 'GET',
    body,
    headers: { Authorization: 'private-token', Cookie: 'private-cookie' },
  })
}

function publicEntry(
  handle: (request: Request) => Promise<Response>,
  fixture: ReturnType<typeof reportingFixture>,
) {
  return workerFetchEntry(requestBodyEntry(handle), {
    fetch,
    now: () => 1_000_000,
    randomToken: () => 'unused',
    errorReporting: fixture.runtime,
  })
}

function wireCopy(response: Response): Response {
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers(response.headers),
  })
}

it('preserves safe diagnostics across the workspace wire and strips the final hint', async () => {
  for (const [type, error] of [
    ['TypeError', new TypeError('private message')],
    [
      'Error',
      Object.defineProperty(new TypeError('private message'), 'constructor', {
        value: { name: 'private class?token=private' },
      }),
    ],
  ] as const) {
    const fixture = reportingFixture()
    Object.assign(error, {
      code: 'service_unavailable',
      orgId: 'private-org',
      workspaceId: 'private-workspace',
      sessionId: 'private-session',
      sandboxId: 'private-sandbox',
      cause: new Error('private cause'),
    })
    error.stack = [
      'TypeError: private message',
      ...Array.from(
        { length: 51 },
        () =>
          '    at run (https://private.example/private/index.js?token=private:12:4)',
      ),
    ].join('\n')
    const sent = workspaceDiagnosticResponse(errorResponse(error))
    const hint = sent.headers.get(WORKER_ERROR_DIAGNOSTIC_HEADER)
    expect(hint).toEqual(expect.any(String))
    const copied = wireCopy(sent)
    expect(responseDiagnostic(copied)).toBeUndefined()
    const received = consumeWorkspaceDiagnosticResponse(copied)
    const frames = Array.from({ length: 50 }, () => ({
      function: 'run',
      filename: '/index.js',
      lineno: 12,
      colno: 4,
      in_app: true,
    }))
    const diagnosticOnWire: unknown = JSON.parse(atob(hint ?? ''))
    expect(diagnosticOnWire).toEqual({
      version: 1,
      type,
      frames,
      code: 'service_unavailable',
    })
    expect(responseDiagnostic(received)).toEqual({
      type,
      code: 'service_unavailable',
      frames,
    })
    expect(received.headers.has(WORKER_ERROR_DIAGNOSTIC_HEADER)).toBe(false)
    received.headers.set(WORKER_ERROR_DIAGNOSTIC_HEADER, 'private forged hint')
    const response = await publicEntry(async () => received, fixture)(
      request(),
      reportingEnvironment(),
    )
    expect(response.status).toBe(500)
    expect(response.headers.has(WORKER_ERROR_DIAGNOSTIC_HEADER)).toBe(false)
    expect(await response.json()).toEqual({
      error: {
        code: 'internal_error',
        message: 'The request failed. Try again.',
      },
    })
    await flushReporting(fixture.runtime)
    expect(fixture.envelopes).toHaveLength(1)
    expect(fixture.envelopes[0][1][0][1]).toMatchObject({
      sdk: { name: 'sentry.javascript.cloudflare', version: '11.11.0' },
      exception: {
        values: [
          { type, value: 'The Worker request failed.', stacktrace: { frames } },
        ],
      },
      tags: {
        component: 'request',
        classification: 'request_failed',
        'error.code': 'service_unavailable',
        'http.method': 'GET',
        'http.route': '/api/orgs/:param/workspaces/:param',
        'http.status_code': '500',
      },
    })
    expect(fixture.serialized()).not.toContain('private')
  }
})

it('bounds the private header and retains safe frames when long diagnostics need trimming', async () => {
  const error = new HttpError(503, 'service_unavailable', 'private message')
  const name = 'x'.repeat(120)
  const bundle = `chunk-${'a'.repeat(64)}.js`
  error.stack = [
    'HttpError: private message',
    ...Array.from(
      { length: 50 },
      () => `    at ${name} (https://private.example/private/${bundle}:12:4)`,
    ),
  ].join('\n')
  const sent = workspaceDiagnosticResponse(errorResponse(error))
  const hint = sent.headers.get(WORKER_ERROR_DIAGNOSTIC_HEADER)
  expect(hint).toEqual(expect.any(String))
  expect(new TextEncoder().encode(hint ?? '').byteLength).toBeLessThanOrEqual(
    16_384,
  )
  const received = consumeWorkspaceDiagnosticResponse(wireCopy(sent))
  const diagnostic = responseDiagnostic(received)
  expect(diagnostic).toMatchObject({
    type: 'HttpError',
    code: 'service_unavailable',
  })
  expect(diagnostic?.frames.length).toBeGreaterThan(0)
  expect(diagnostic?.frames.length).toBeLessThan(50)
  for (const frame of diagnostic?.frames ?? []) {
    expect(frame).toEqual({
      function:
        'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      filename:
        '/chunk-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.js',
      lineno: 12,
      colno: 4,
      in_app: true,
    })
  }
  expect(received.status).toBe(503)
  expect(await received.json()).toEqual({
    error: { code: 'service_unavailable', message: 'private message' },
  })
})

it('discards malformed and oversized hints without changing the response', async () => {
  for (const hint of [
    'not valid base64!',
    btoa('{"version":1,"type":"TypeError","frames":{}}'),
    btoa(
      JSON.stringify({
        version: 1,
        type: 'TypeError',
        frames: [],
        padding: 'x'.repeat(16_384),
      }),
    ),
  ]) {
    const original = new Response('original body', {
      status: 503,
      headers: { [WORKER_ERROR_DIAGNOSTIC_HEADER]: hint, 'X-Original': 'yes' },
    })
    const received = consumeWorkspaceDiagnosticResponse(wireCopy(original))
    expect(responseDiagnostic(received)).toBeUndefined()
    expect(received.headers.has(WORKER_ERROR_DIAGNOSTIC_HEADER)).toBe(false)
    expect(received.headers.get('X-Original')).toBe('yes')
    expect(received.status).toBe(503)
    expect(await received.text()).toBe('original body')
  }
})

it('strips a forged upstream hint before it can become a local diagnostic', async () => {
  const fixture = reportingFixture()
  const hint = btoa(
    JSON.stringify({
      version: 1,
      type: 'TypeError',
      code: 'service_unavailable',
      frames: [{ filename: '/index.js', function: 'forged', lineno: 99 }],
    }),
  )
  const sent = workspaceDiagnosticResponse(
    new Response('upstream body', {
      status: 502,
      headers: { [WORKER_ERROR_DIAGNOSTIC_HEADER]: hint },
    }),
  )
  expect(sent.headers.has(WORKER_ERROR_DIAGNOSTIC_HEADER)).toBe(false)
  const received = consumeWorkspaceDiagnosticResponse(wireCopy(sent))
  expect(responseDiagnostic(received)).toBeUndefined()
  const response = await publicEntry(async () => received, fixture)(
    request(),
    reportingEnvironment(),
  )
  expect(response.status).toBe(502)
  expect(await response.text()).toBe('upstream body')
  await flushReporting(fixture.runtime)
  expect(fixture.envelopes).toHaveLength(1)
  expect(fixture.envelopes[0][1][0][1]).toMatchObject({
    exception: {
      values: [{ type: 'Error', value: 'The Worker request failed.' }],
    },
  })
  expect(fixture.serialized()).not.toMatch(
    /forged|service_unavailable|index\.js/,
  )
})

it('sends no event when the body limit replaces an inner hinted 500 with 413', async () => {
  const fixture = reportingFixture()
  const handle = publicEntry(async (bounded) => {
    try {
      await bounded.arrayBuffer()
    } catch {
      return consumeWorkspaceDiagnosticResponse(
        wireCopy(
          workspaceDiagnosticResponse(errorResponse(new TypeError('private'))),
        ),
      )
    }
    return new Response('unexpected accepted body', { status: 503 })
  }, fixture)
  const response = await handle(
    request(new Uint8Array(1_000_001)),
    reportingEnvironment(),
  )
  expect(response.status).toBe(413)
  expect(response.headers.has(WORKER_ERROR_DIAGNOSTIC_HEADER)).toBe(false)
  expect(await response.json()).toEqual({
    error: {
      code: 'body_too_large',
      message: 'The request is too large. Send less data.',
    },
  })
  await flushReporting(fixture.runtime)
  expect(fixture.envelopes).toEqual([])
})
