import { expect, it } from 'vitest'

import { readEndpointAddress } from '../../src/shared/endpoint-address'
import { downstreamHeaders } from './headers'
import { redactErrorBody } from './redact'

it('preserves protocol paths without a saved suffix and hides saved path or query forms', async () => {
  for (const [agent, endpoint, route, search, echoed, expected] of [
    [
      'codex',
      'https://proxy.example.com/v1',
      '/responses',
      '',
      '/v1 /v1/responses /responses',
      '/v1 /v1/responses /responses',
    ],
    [
      'codex',
      'https://proxy.example.com',
      '/responses',
      '',
      '/responses',
      '/responses',
    ],
    [
      'claude',
      'https://proxy.example.com/v1',
      '/v1/messages',
      '?beta=true',
      '/v1/messages?beta=true',
      '/v1/messages?beta=true',
    ],
    [
      'codex',
      'https://proxy.example.com/private/v1',
      '/responses',
      '',
      '/private/v1 /private/v1/responses',
      '[redacted] [redacted]',
    ],
    [
      'codex',
      'https://proxy.example.com/v1?key=x',
      '/responses',
      '',
      '/v1?key=x /v1/responses?key=x',
      '[redacted] [redacted]',
    ],
  ] as const) {
    const address = readEndpointAddress(endpoint, agent, { route, search })
    if (!address) throw new Error('Expected a valid endpoint address.')
    const headers = downstreamHeaders(
      new Headers({ 'x-request-id': echoed }),
      address.secretForms,
    )
    const response = new Response(
      redactErrorBody(new Blob([echoed]).stream(), ...address.secretForms),
      { status: 400, headers },
    )
    expect.soft(response.headers.get('x-request-id'), endpoint).toBe(expected)
    expect.soft(await response.text(), endpoint).toBe(expected)
  }
})
