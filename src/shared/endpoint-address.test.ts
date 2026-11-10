import { expect, it } from 'vitest'

import { readEndpointAddress } from './endpoint-address'

it('accepts HTTPS and loopback HTTP while preserving the trimmed full address', () => {
  for (const [endpoint, origin, host] of [
    [
      'https://user:password@proxy.example.test:8443/private/v1?key=value#part',
      'https://proxy.example.test:8443',
      'proxy.example.test:8443',
    ],
    [
      'https://proxy.example.test:443/',
      'https://proxy.example.test',
      'proxy.example.test',
    ],
    ['http://localhost:8787/v1', 'http://localhost:8787', 'localhost:8787'],
    ['http://127.0.0.1:80/v1', 'http://127.0.0.1', '127.0.0.1'],
    ['http://[::1]:8787/v1', 'http://[::1]:8787', '[::1]:8787'],
  ]) {
    expect(readEndpointAddress(` \n${endpoint}\t `), endpoint).toEqual({
      endpoint,
      origin,
      host,
    })
  }
})

it('refuses malformed addresses and protocols that can expose the login', () => {
  for (const endpoint of [
    'not a URL',
    '/relative/path',
    'http://proxy.example.test/v1',
    'http://localhost.example.test',
    'http://127.0.0.1.example.test',
    'ftp://localhost/v1',
    '',
    null,
  ]) {
    expect(readEndpointAddress(endpoint), String(endpoint)).toBeNull()
  }
})
