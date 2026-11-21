import { expect, it } from 'vitest'

import { failureCause } from '../../runner/sdk-helper/src/providers/failure'
import { readEndpointAddress } from '../../src/shared/endpoint-address'
import { downstreamHeaders } from './headers'
import { redactErrorBody } from './redact'
import { RedactionPolicy } from './redaction-policy'

function filteredText(
  text: string,
  keys: string[],
  addresses: readonly string[] = [],
) {
  const bytes = new TextEncoder().encode(text)
  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const byte of bytes) controller.enqueue(Uint8Array.of(byte))
      controller.close()
    },
  })
  return new Response(
    redactErrorBody(source, new RedactionPolicy(keys, addresses)),
  ).text()
}

it('keeps JSON protocol text and the model-unavailable cause with short placeholder keys', async () => {
  for (const key of ['x', '1', 'e', 'null', 'true', 'error']) {
    const text =
      '{"x":1,"error":{"message":"The model does not exist","code":"context_length_exceeded","param":null},"enabled":true,"disabled":false,"count":199,"ratio":1.25e10,"values":[null,true,false,1,{"x":"ordinary"}],"echo":' +
      JSON.stringify(`Bearer ${key}; Invalid key ${key}; ${key}`) +
      '}'
    const actual = await filteredText(text, [key])
    expect
      .soft(actual, key)
      .toBe(
        '{"x":1,"error":{"message":"The model does not exist","code":"context_length_exceeded","param":null},"enabled":true,"disabled":false,"count":199,"ratio":1.25e10,"values":[null,true,false,1,{"x":"ordinary"}],"echo":"Bearer [redacted]; Invalid key [redacted]; [redacted]"}',
      )
    expect.soft(failureCause(actual), key).toEqual({
      type: 'failed',
      code: 'agent_model_unavailable',
      message: 'The selected model is unavailable. Choose another model.',
    })
    for (const prefix of [
      'not a valid key: ',
      'true key was rejected: ',
      '{"error":"Bearer ',
    ])
      expect
        .soft(await filteredText(`${prefix}${key}`, [key]), `${prefix}${key}`)
        .toBe(`${prefix}[redacted]`)
  }
  for (const [text, key] of [
    ['null', 'null'],
    ['true', 'true'],
    ['199', '1'],
    ['1.25e10', 'e'],
  ])
    expect.soft(await filteredText(text, [key]), text).toBe(text)
  expect.soft(await filteredText('-', ['-'])).toBe('[redacted]')
  expect(await filteredText('{"count":-1,"echo":"-"}', ['-'])).toBe(
    '{"count":-1,"echo":"[redacted]"}',
  )
})

it('keeps fixed response header values and redacts short echoes in opaque headers once', () => {
  const endpoint = 'https://proxy.example.test/private/v1'
  for (const key of ['x', '1', 'e', 'null', 'true', 'error']) {
    const actual = downstreamHeaders(
      new Headers({
        'content-type': 'text/event-stream; charset=utf-8',
        'retry-after': '1',
        'x-should-retry': 'true',
        'anthropic-ratelimit-tokens-remaining': '199',
        'anthropic-ratelimit-tokens-reset': '2026-11-21T01:02:03Z',
        'x-ratelimit-reset-tokens': '1m2s',
        'x-reasoning-included': 'true',
        'x-codex-safety-buffering-enabled': 'true',
        'request-id': `Bearer ${key}; Invalid key ${key}; ${endpoint}`,
        'x-request-id': `{"error":null,"x":1,"enabled":true,"echo":${JSON.stringify(key)}}`,
      }),
      new RedactionPolicy([key], [endpoint]),
      true,
    )
    expect.soft(Object.fromEntries(actual), key).toEqual({
      'content-type': 'text/event-stream; charset=utf-8',
      'retry-after': '1',
      'x-should-retry': 'true',
      'anthropic-ratelimit-tokens-remaining': '199',
      'anthropic-ratelimit-tokens-reset': '2026-11-21T01:02:03Z',
      'x-ratelimit-reset-tokens': '1m2s',
      'x-reasoning-included': 'true',
      'x-codex-safety-buffering-enabled': 'true',
      'request-id': 'Bearer [redacted]; Invalid key [redacted]; [redacted]',
      'x-request-id': '{"error":null,"x":1,"enabled":true,"echo":"[redacted]"}',
    })
    expect
      .soft(
        Object.fromEntries(
          downstreamHeaders(
            new Headers({
              'x-request-id': key,
              'retry-after': `Bearer ${key}`,
            }),
            new RedactionPolicy([key]),
          ),
        ),
        key,
      )
      .toEqual({
        'x-request-id': '[redacted]',
        'retry-after': 'Bearer [redacted]',
      })
  }
  for (const [value, expected] of [
    ['text/event-stream; x.foo=bar', 'text/event-stream; x.foo=bar'],
    ['application/x-ndjson;', 'application/x-ndjson;'],
    ['application/x-ndjson; foo', 'application/[redacted]-ndjson; foo'],
    [
      'application/x-ndjson; foo="a; \\"b"',
      'application/x-ndjson; foo="a; \\"b"',
    ],
  ])
    expect
      .soft(
        downstreamHeaders(
          new Headers({ 'content-type': value }),
          new RedactionPolicy(['x']),
        ).get('content-type'),
        value,
      )
      .toBe(expected)
  expect(
    downstreamHeaders(
      new Headers({ 'x-request-id': 'Invalid key: x' }),
      new RedactionPolicy(['x']),
    ).get('x-request-id'),
  ).toBe('Invalid key: [redacted]')
})

it('keeps JSON string escapes and property names while redacting split escaped key echoes', async () => {
  for (const key of ['n', '"', '\\', '[', 'x"\\e']) {
    const property = JSON.stringify(key)
    const text = `{${property}:"kept","message":${JSON.stringify(`line\n é💡 Bearer ${key}; Invalid key ${key}`)}}`
    expect
      .soft(await filteredText(text, [key]), key)
      .toBe(
        `{${property}:"kept","message":"line\\n é💡 Bearer [redacted]; Invalid key [redacted]"}`,
      )
    expect
      .soft(await filteredText(`Invalid key ${key}`, [key]), key)
      .toBe('Invalid key [redacted]')
    expect
      .soft(
        downstreamHeaders(
          new Headers({ 'x-request-id': key }),
          new RedactionPolicy([key]),
        ).get('x-request-id'),
        key,
      )
      .toBe('[redacted]')
  }
  expect(
    await filteredText('{"message":"\\n\\u0078 \\u0078\\n \\u0078ylophone"}', [
      'x',
    ]),
  ).toBe('{"message":"\\n[redacted] [redacted]\\n \\u0078ylophone"}')
  for (const [text, expected] of [
    ['Invalid API key: “sk-1234”', 'Invalid API key: “[redacted]”'],
    [
      '{"message":"Invalid API key: “sk-1234”"}',
      '{"message":"Invalid API key: “[redacted]”"}',
    ],
    [
      '{"message":"Invalid API key: \\u201Csk-1234\\u201D"}',
      '{"message":"Invalid API key: \\u201C[redacted]\\u201D"}',
    ],
    ['密钥sk-1234无效', '密钥[redacted]无效'],
    ['キーsk-1234は無効です', 'キー[redacted]は無効です'],
    ['sk-1234는', '[redacted]는'],
    ['keyʼsk-1234ʼ', 'keyʼ[redacted]ʼ'],
  ])
    expect.soft(await filteredText(text, ['sk-1234']), text).toBe(expected)
})

it('keeps long key and saved address matches in protocol values and nested markers out of replacements', async () => {
  const address = readEndpointAddress(
    'https://proxy.example.test/v1?key=x',
    'codex',
    {
      route: '/responses',
    },
  )
  if (!address) throw new Error('Expected a valid endpoint address.')
  const keys = ['e', 'text/event-stream', '123456789012']
  const headers = downstreamHeaders(
    new Headers({
      'content-type': 'text/event-stream',
      'retry-after': '123456789012',
      'x-request-id': '/v1?key=x /v1/responses?key=x e',
    }),
    new RedactionPolicy(keys, address.secretForms),
  )
  expect.soft(Object.fromEntries(headers)).toEqual({
    'content-type': '[redacted]',
    'retry-after': '[redacted]',
    'x-request-id': '[redacted] [redacted] [redacted]',
  })
  expect(
    await filteredText(
      '{"text/event-stream":123456789012,"message":"prefixtext/event-streamsuffix /v1?key=x /v1/responses?key=x e"}',
      keys,
      address.secretForms,
    ),
  ).toBe(
    '{"[redacted]":[redacted],"message":"prefix[redacted]suffix [redacted] [redacted] [redacted]"}',
  )
})
