import { productName } from '../../src/shared/brand'

export type OutboundRequestOptions = Omit<RequestInit, 'redirect'>

export function outboundRequest(
  url: string | URL,
  options: OutboundRequestOptions = {},
): Request {
  const headers = new Headers(options.headers)
  headers.set('User-Agent', productName)
  // The Workers runtime rejects 'error'. Manual keeps credentials from
  // following redirects.
  return new Request(url, {
    ...options,
    headers,
    redirect: 'manual',
  })
}
