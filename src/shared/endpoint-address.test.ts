import { expect, it } from 'vitest'

import { productDomain } from '../../docs/mockups/src/brand'

import { readEndpointAddress } from './endpoint-address'

it('normalizes public addresses and builds only the model routes of each agent', () => {
  for (const [agent, input, route, endpoint, upstream] of [
    [
      'claude',
      'https://proxy.example.test/base/v1/?key=value#part',
      '/v1/messages',
      'https://proxy.example.test/base?key=value',
      'https://proxy.example.test/base/v1/messages?key=value',
    ],
    [
      'claude',
      'https://proxy.example.test/base/',
      '/v1/messages/count_tokens',
      'https://proxy.example.test/base',
      'https://proxy.example.test/base/v1/messages/count_tokens',
    ],
    [
      'claude',
      'https://proxy.example.test/v1',
      '/v1/models',
      'https://proxy.example.test',
      'https://proxy.example.test/v1/models',
    ],
    [
      'codex',
      'https://proxy.example.test:8443/base/v1/?key=value#part',
      '/responses',
      'https://proxy.example.test:8443/base/v1?key=value',
      'https://proxy.example.test:8443/base/v1/responses?key=value',
    ],
    [
      'codex',
      'https://proxy.example.test:443/v1/',
      '/models',
      'https://proxy.example.test/v1',
      'https://proxy.example.test/v1/models',
    ],
  ] as const) {
    expect(readEndpointAddress(` \n${input}\t `, agent, { route })).toEqual({
      endpoint,
      origin: new URL(endpoint).origin,
      host: new URL(endpoint).host,
      upstream,
    })
  }
  expect(
    readEndpointAddress('https://proxy.example.test', 'claude', {
      route: '/responses',
    }),
  ).toBeNull()
  expect(
    readEndpointAddress('https://proxy.example.test/v1', 'codex', {
      route: '/v1/messages',
    }),
  ).toBeNull()
})

it('refuses credentials, non-public destinations, internal names, and app domains', () => {
  for (const endpoint of [
    'not a URL',
    '/relative/path',
    '',
    null,
    'http://proxy.example.test',
    'http://localhost',
    'https://user@proxy.example.test',
    'https://user:password@proxy.example.test',
    'https://localhost',
    'https://proxy.localhost.',
    'https://proxy',
    'https://proxy.local',
    'https://proxy.internal',
    'https://proxy.lan',
    'https://metadata.google.internal',
    'https://proxy.home.arpa',
    'https://0.0.0.0',
    'https://10.0.0.1',
    'https://100.64.0.1',
    'https://127.0.0.1',
    'https://2130706433',
    'https://0x7f000001',
    'https://169.254.169.254',
    'https://172.16.0.1',
    'https://192.168.1.1',
    'https://192.0.2.1',
    'https://192.88.99.2',
    'https://198.18.0.1',
    'https://198.51.100.1',
    'https://203.0.113.1',
    'https://224.0.0.1',
    'https://255.255.255.255',
    'https://[::]',
    'https://[::1]',
    'https://[::ffff:127.0.0.1]',
    'https://[fc00::1]',
    'https://[fe80::1]',
    'https://[ff02::1]',
    'https://[2001:db8::1]',
    `https://${productDomain}`,
    `https://api.${productDomain}.`,
    `https://app.${productDomain}`,
    'https://conductive.page',
    'https://workspace.conductive.page',
  ]) {
    expect(
      readEndpointAddress(endpoint, 'claude', {
        refusedDomains: ['conductive.page'],
      }),
      String(endpoint),
    ).toBeNull()
  }
})

it('keeps query bytes when they end with a slash and joins a request query', () => {
  expect(
    readEndpointAddress(
      'https://proxy.example.test/v1?key=abc%2F&path=/',
      'codex',
      { route: '/responses', search: '?trace=a%20b' },
    ),
  ).toEqual({
    endpoint: 'https://proxy.example.test/v1?key=abc%2F&path=/',
    origin: 'https://proxy.example.test',
    host: 'proxy.example.test',
    upstream:
      'https://proxy.example.test/v1/responses?key=abc%2F&path=/&trace=a%20b',
  })
})

it('accepts public IP addresses, unrelated domain names, and custom HTTPS ports', () => {
  for (const endpoint of [
    'https://8.8.8.8',
    'https://192.0.0.9',
    'https://192.0.0.10',
    'https://[2606:4700:4700::1111]',
    'https://proxy.example.test:8000',
    'https://proxy.example.test:65535',
    `https://${productDomain}.example.test`,
  ]) {
    expect(readEndpointAddress(endpoint, 'codex')?.endpoint, endpoint).toBe(
      endpoint,
    )
  }
})
