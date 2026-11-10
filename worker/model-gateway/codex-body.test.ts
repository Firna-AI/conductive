import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { CODEX, MACHINE_ORIGIN } from '../chat/harness.test-support'
import {
  streamedBody,
  streamedRequest,
} from '../http/request-body.test-support'
import { createHarness, type TestHarness } from '../test-support/harness'
import {
  expectCodexRefusal,
  observeCodexUpload,
  refusedModelRequest,
} from './codex-body.test-support'
import { deferred, gatewayHttp, gatewayPath } from './http.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(() => harness.reset())
afterAll(() => harness.dispose())

it.each([
  ['true', '{"background":true}'],
  ['null', '{"background":null}'],
  ['a number', '{"background":0}'],
  ['a string', '{"background":"false"}'],
  ['an array', '{"background":[]}'],
  ['an object', '{"background":{}}'],
  ['an escaped key', '{"back\\u0067round":true}'],
  ['a repeated key', '{"background":true,"background":false}'],
  ['a later repeated key', '{"background":false,"background":true}'],
])(
  'refuses background with %s before the complete upload reaches OpenAI',
  async (_name, body) => {
    const client = await gatewayHttp(harness, CODEX)
    try {
      await expectCodexRefusal(client, body)
    } finally {
      await client.dispose()
    }
  },
)

it.each([
  ['an array root', '[]'],
  ['a scalar root', 'false'],
  ['a truncated object', '{"input":"x"'],
  ['a truncated string', '{"input":"x'],
  ['a truncated literal', '{"input":fals'],
  ['a truncated number', '{"input":1e'],
  ['a missing colon', '{"input" "x"}'],
  ['a missing comma', '{"a":1 "b":2}'],
  ['an object trailing comma', '{"a":1,}'],
  ['an array trailing comma', '{"a":[1,]}'],
  ['mismatched containers', '{"a":[1}}'],
  ['an invalid escape', '{"a":"\\q"}'],
  ['an invalid Unicode escape', '{"a":"\\uXX00"}'],
  ['a raw control character', '{"a":"\n"}'],
  ['a leading zero', '{"a":01}'],
  ['an invalid fraction', '{"a":1.}'],
  ['an invalid exponent', '{"a":1e+}'],
  ['an invalid literal', '{"a":False}'],
  ['a second object', '{} {}'],
  ['trailing data', '{}\ntrue'],
])('refuses %s without completing the upstream body', async (_name, body) => {
  const client = await gatewayHttp(harness, CODEX)
  try {
    await expectCodexRefusal(client, body)
  } finally {
    await client.dispose()
  }
})

it.each([
  ['an absent field', ' {"model":"future","input":"é 🎉","stream":true}\n'],
  ['literal false', '{"background":false,"background":false}'],
  ['an escaped false key', '{"back\\u0067round":false}'],
  [
    'a nested field',
    '{"tools":[{"background":true}],"other":{"background":null}}',
  ],
  [
    'JSON values',
    '{"a":[null,false,true,-0,1.25e-3,1E+2,{},[]],"b":"\\"\\\\\\/\\b\\f\\n\\r\\t\\u0061"}',
  ],
])('passes %s byte for byte in one-byte chunks', async (_name, body) => {
  const client = await gatewayHttp(harness, CODEX)
  const bytes = new TextEncoder().encode(body)
  let cursor = 0
  const source = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        if (cursor === bytes.length) controller.close()
        else controller.enqueue(bytes.subarray(cursor, ++cursor))
      },
    },
    { highWaterMark: 0 },
  )
  try {
    const response = await client.fetch(
      streamedRequest(`${MACHINE_ORIGIN}${gatewayPath('codex')}`, source, {
        Authorization: `Bearer ${client.token}`,
        'Content-Encoding': 'identity',
      }),
    )
    expect(response.status).toBe(200)
    await response.text()
    expect(client.openai.bodies).toEqual([body])
    expect(client.openai.requests[0].headers.get('content-encoding')).toBe(
      'identity',
    )
  } finally {
    await client.dispose()
  }
})

it('refuses an encoded body before calling OpenAI and cancels its upload', async () => {
  const client = await gatewayHttp(harness, CODEX)
  const upload = streamedBody([new TextEncoder().encode('{"background":true}')])
  try {
    const response = await client.fetch(
      streamedRequest(`${MACHINE_ORIGIN}${gatewayPath('codex')}`, upload.body, {
        Authorization: `Bearer ${client.token}`,
        'Content-Encoding': 'gzip',
      }),
    )
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual(refusedModelRequest)
    expect(upload.observed.cancelled).toBe(1)
    expect(client.openai.requests).toHaveLength(0)
  } finally {
    await client.dispose()
  }
})

it('refuses an absent body', async () => {
  const client = await gatewayHttp(harness, CODEX)
  try {
    const response = await client.request(undefined, { body: null })
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual(refusedModelRequest)
  } finally {
    await client.dispose()
  }
})

it('ends a refused upload without waiting for the remaining client bytes', async () => {
  const client = await gatewayHttp(harness, CODEX)
  const waiting = deferred<void>()
  const cancelled = deferred<void>()
  let pulls = 0
  const upload = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        if (++pulls === 1)
          controller.enqueue(new TextEncoder().encode('{"background":true,'))
        else waiting.resolve()
      },
      cancel: () => cancelled.resolve(),
    },
    { highWaterMark: 0 },
  )
  const abort = new AbortController()
  const upstream = observeCodexUpload(client)
  const init = {
    method: 'POST',
    body: upload,
    duplex: 'half',
    signal: abort.signal,
    headers: { Authorization: `Bearer ${client.token}` },
  }
  const pending = client.fetch(
    new Request(`${MACHINE_ORIGIN}${gatewayPath('codex')}`, init),
  )
  try {
    expect(
      await Promise.race([
        pending.then(() => 'refused'),
        waiting.promise.then(() => 'read the remaining upload'),
      ]),
    ).toBe('refused')
    const response = await pending
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual(refusedModelRequest)
    await cancelled.promise
    await upstream.ended
    expect(upstream.observed).toEqual({ bytes: 0, completed: false })
    expect(client.openai.requests[0].signal.aborted).toBe(true)
  } finally {
    abort.abort()
    await pending
    await client.dispose()
  }
})
