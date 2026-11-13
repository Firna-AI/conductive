import { productDomain } from '../../docs/mockups/src/brand'

const internalDomains = [
  'localhost',
  'local',
  'localdomain',
  'internal',
  'intranet',
  'lan',
  'home',
  'home.arpa',
  'corp',
  'invalid',
  productDomain,
]

export function isPublicEndpointHost(
  hostname: string,
  refusedDomains: readonly string[] = [],
): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '')
  if (host.startsWith('[') || /^[\d.]+$/.test(host)) return false
  return (
    host.includes('.') &&
    host
      .split('.')
      .every((label) => /^[a-z\d](?:[a-z\d-]*[a-z\d])?$/.test(label)) &&
    ![...internalDomains, ...refusedDomains].some((value) => {
      const domain = value.toLowerCase().replace(/\.$/, '')
      return domain !== '' && (host === domain || host.endsWith(`.${domain}`))
    })
  )
}
