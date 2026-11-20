import { afterEach, expect, it, vi } from 'vitest'

import type { HttpFetch } from './env'
import { streamedBody } from './http/request-body.test-support'
import { createMailSender, MailDeliveryError } from './mail-sender'
import { heldOperation } from './test-support/held-operation'
import { errorSummary } from './warning-values'

const canary = 'synthetic-private-mail-canary'
const env = {
  APP_ORIGIN: 'https://app.conductive.build',
  RESEND_API_KEY: canary,
}
const message = {
  recipient: `${canary}@example.com`,
  subject: canary,
  text: canary,
  deliveryKey: async () => canary,
  developmentLog: canary,
}

afterEach(() => vi.restoreAllMocks())

it('distinguishes missing mail configuration and fixed request error types without private text', async () => {
  const fetch = vi.fn<HttpFetch>()
  const missing = await createMailSender({ APP_ORIGIN: env.APP_ORIGIN }, fetch)
    .send(message)
    .catch((error: unknown) => error)
  expect(errorSummary(missing)).toEqual({
    kind: 'mail',
    reason: 'not_configured',
    status: null,
    code: null,
    errorType: null,
  })
  expect(fetch).not.toHaveBeenCalled()
  const invalidHeader = await createMailSender(
    { ...env, RESEND_API_KEY: `${canary}\n${canary}` },
    fetch,
  )
    .send(message)
    .catch((error: unknown) => error)
  expect(errorSummary(invalidHeader)).toEqual({
    kind: 'mail',
    reason: 'request_failed',
    status: null,
    code: null,
    errorType: 'TypeError',
  })
  expect(invalidHeader).toMatchObject({ outcome: 'uncertain' })
  expect(fetch).not.toHaveBeenCalled()
  const privateError = new Error(canary)
  privateError.name = canary
  for (const [failure, errorType] of [
    [new TypeError(canary), 'TypeError'],
    [new DOMException(canary, 'TimeoutError'), 'TimeoutError'],
    [privateError, 'unknown'],
  ] as const) {
    const error = await createMailSender(env, async () => {
      throw failure
    })
      .send(message)
      .catch((error: unknown) => error)
    expect(error).toBeInstanceOf(MailDeliveryError)
    expect(error).toMatchObject({ outcome: 'uncertain' })
    expect(errorSummary(error)).toEqual({
      kind: 'mail',
      reason: 'request_failed',
      status: null,
      code: null,
      errorType,
    })
  }
})

it('reads only allowlisted Resend names and retains clear and uncertain delivery outcomes', async () => {
  for (const [status, name, code, outcome] of [
    [403, 'validation_error', 'validation_error', 'rejected'],
    [401, 'invalid_api_key', 'invalid_api_key', 'rejected'],
    [408, canary, 'unknown', 'uncertain'],
    [
      409,
      'concurrent_idempotent_requests',
      'concurrent_idempotent_requests',
      'uncertain',
    ],
    [500, 'application_error', 'application_error', 'uncertain'],
  ] as const) {
    const response = Response.json({
      name,
      message: canary,
      code: canary,
      token: canary,
      statusCode: 999,
    })
    const error = await createMailSender(
      env,
      async () => new Response(response.body, { status }),
    )
      .send(message)
      .catch((error: unknown) => error)
    expect(error).toMatchObject({ outcome })
    expect(errorSummary(error)).toEqual({
      kind: 'mail',
      reason: 'provider_refused',
      status,
      code,
      errorType: null,
    })
    expect(response.body?.locked).toBe(false)
  }
})

it('cancels oversized refusal bodies and uses unknown for unreadable provider codes', async () => {
  const oversized = streamedBody(
    [new Uint8Array(10_000), new Uint8Array(10_000)],
    true,
  )
  for (const body of [oversized.body, new Response(canary).body, null]) {
    const error = await createMailSender(
      env,
      async () => new Response(body, { status: 403 }),
    )
      .send(message)
      .catch((error: unknown) => error)
    expect(error).toMatchObject({ outcome: 'rejected' })
    expect(errorSummary(error)).toEqual({
      kind: 'mail',
      reason: 'provider_refused',
      status: 403,
      code: 'unknown',
      errorType: null,
    })
  }
  expect(oversized.observed).toEqual({ pulled: 1, bytes: 10_000, cancelled: 1 })
  expect(oversized.body.locked).toBe(false)
})

it('ends a stalled refusal body read at the request timeout without awaiting stalled cancellation', async () => {
  const controller = new AbortController()
  const timeout = vi
    .spyOn(AbortSignal, 'timeout')
    .mockReturnValue(controller.signal)
  const reading = heldOperation()
  let cancelled = 0
  const body = new ReadableStream<Uint8Array>(
    {
      async pull() {
        await reading.wait()
      },
      cancel() {
        cancelled++
        return new Promise<void>(() => undefined)
      },
    },
    { highWaterMark: 0 },
  )
  const delivery = createMailSender(
    env,
    async () => new Response(body, { status: 503 }),
  )
    .send(message)
    .catch((error: unknown) => error)
  await reading.entered
  controller.abort(new DOMException(canary, 'TimeoutError'))
  const error = await delivery
  expect(error).toMatchObject({ outcome: 'uncertain' })
  expect(errorSummary(error)).toEqual({
    kind: 'mail',
    reason: 'provider_refused',
    status: 503,
    code: 'unknown',
    errorType: 'TimeoutError',
  })
  expect(timeout).toHaveBeenCalledWith(30_000)
  expect(cancelled).toBe(1)
  expect(body.locked).toBe(false)
  reading.release()
})

it('retains delivery outcomes when response cleanup or reads fail', async () => {
  for (const [status, outcome, reason, code] of [
    [200, 'sent', 'request_failed', null],
    [403, 'rejected', 'provider_refused', 'unknown'],
  ] as const) {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.error(new TypeError(canary))
      },
    })
    const error = await createMailSender(
      env,
      async () => new Response(body, { status }),
    )
      .send(message)
      .catch((error: unknown) => error)
    expect(error).toMatchObject({ outcome })
    expect(errorSummary(error)).toEqual({
      kind: 'mail',
      reason,
      status,
      code,
      errorType: 'TypeError',
    })
  }
})
