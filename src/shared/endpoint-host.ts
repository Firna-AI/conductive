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

function publicIpv4(host: string): boolean {
  if (host === '192.0.0.9' || host === '192.0.0.10') return true
  const [a, b, c] = host.split('.').map(Number)
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 &&
      (b === 168 ||
        (b === 0 && (c === 0 || c === 2)) ||
        (b === 88 && c === 99))) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113)
  )
}

function publicIpv6(host: string): boolean {
  const [first, second] = host
    .slice(1, -1)
    .split(':')
    .map((part) => parseInt(part || '0', 16))
  // Global unicast only. Exclude special-use and transition networks within it.
  return (
    first >= 0x2000 &&
    first <= 0x3fff &&
    !(first === 0x2001 && (second <= 0x1ff || second === 0xdb8)) &&
    first !== 0x2002 &&
    !(first === 0x3fff && second <= 0xfff)
  )
}

export function isPublicEndpointHost(
  hostname: string,
  refusedDomains: readonly string[] = [],
): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '')
  if (host.startsWith('[')) return publicIpv6(host)
  if (/^[\d.]+$/.test(host)) return publicIpv4(host)
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
