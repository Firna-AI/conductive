export const ENDPOINT_ADDRESS_ERROR = {
  code: 'invalid_endpoint',
  message:
    'Use an https:// address. Only localhost, 127.0.0.1, and [::1] can use http://.',
} as const

export interface EndpointAddress {
  endpoint: string
  origin: string
  host: string
}

export function readEndpointAddress(value: unknown): EndpointAddress | null {
  if (typeof value !== 'string') return null
  const endpoint = value.trim()
  try {
    const url = new URL(endpoint)
    if (
      url.protocol !== 'https:' &&
      !(
        url.protocol === 'http:' &&
        ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      )
    )
      return null
    return { endpoint, origin: url.origin, host: url.host }
  } catch {
    return null
  }
}
