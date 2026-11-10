import { expect } from 'vitest'

import { MACHINE_ORIGIN } from '../chat/harness.test-support'
import {
  streamedBody,
  streamedRequest,
} from '../http/request-body.test-support'
import { deferred, gatewayPath, type gatewayHttp } from './http.test-support'

export const refusedModelRequest = {
  error: {
    type: 'invalid_request_error',
    code: 'model_request_refused',
    param: null,
    message:
      'Use one JSON object with background absent or false and no body encoding.',
  },
}

export function observeCodexUpload(
  client: Awaited<ReturnType<typeof gatewayHttp>>,
) {
  const observed = { bytes: 0, completed: false }
  const ended = deferred<void>()
  client.openai.responseFactories.push(async (request) => {
    try {
      if (!request.body) throw new Error('The upstream upload is missing.')
      for await (const chunk of request.body) observed.bytes += chunk.byteLength
      observed.completed = true
    } catch {
      // A gateway refusal must cancel this original upstream upload.
    } finally {
      ended.resolve()
    }
    return new Response('accepted')
  })
  return { observed, ended: ended.promise }
}

export async function expectCodexRefusal(
  client: Awaited<ReturnType<typeof gatewayHttp>>,
  body: string,
) {
  const bytes = new TextEncoder().encode(body)
  const source = streamedBody(Array.from(bytes, (byte) => Uint8Array.of(byte)))
  const upstream = observeCodexUpload(client)
  const response = await client.fetch(
    streamedRequest(`${MACHINE_ORIGIN}${gatewayPath('codex')}`, source.body, {
      Authorization: `Bearer ${client.token}`,
    }),
  )
  expect(response.status).toBe(400)
  expect(await response.json()).toEqual(refusedModelRequest)
  await upstream.ended
  expect(upstream.observed.completed).toBe(false)
  expect(upstream.observed.bytes).toBeLessThan(bytes.byteLength)
  expect(client.openai.requests[0].signal.aborted).toBe(true)
}
