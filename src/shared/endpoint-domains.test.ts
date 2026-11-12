import { expect, it, vi } from 'vitest'

import { readEndpointAddress } from './endpoint-address'

vi.mock('../../docs/mockups/src/brand', () => ({
  productDomain: 'renamed.example.test',
}))

it('refuses the renamed product domain and its subdomains', () => {
  for (const address of [
    'https://renamed.example.test',
    'https://api.renamed.example.test',
    'https://workspace.renamed.example.test.',
  ]) {
    expect(readEndpointAddress(address, 'claude'), address).toBeNull()
  }
  expect(
    readEndpointAddress('https://public.example.test', 'claude')?.host,
  ).toBe('public.example.test')
})

it('refuses extra domains without changing unrelated public endpoints', () => {
  const options = { refusedDomains: ['CUSTOM-PREVIEWS.EXAMPLE.TEST.'] }
  for (const address of [
    'https://custom-previews.example.test',
    'https://port.custom-previews.example.test:8443',
  ]) {
    expect(readEndpointAddress(address, 'codex', options), address).toBeNull()
  }
  expect(
    readEndpointAddress('https://public.example.test/v1', 'codex', options)
      ?.endpoint,
  ).toBe('https://public.example.test/v1')
})
