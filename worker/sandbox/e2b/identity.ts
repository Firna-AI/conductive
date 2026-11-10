import { ProviderError } from '../errors'

const DNS_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/

export function validDomain(value: string): boolean {
  return (
    value.length <= 253 &&
    value.split('.').every((label) => DNS_LABEL.test(label))
  )
}

export function sandboxId(value: unknown, expected?: string): string {
  if (
    typeof value !== 'string' ||
    !DNS_LABEL.test(value) ||
    (expected !== undefined && value !== expected)
  )
    throw new ProviderError('invalid_response', 502)
  return value
}

export function sandboxSegment(value: string): string {
  if (!DNS_LABEL.test(value)) throw new ProviderError('invalid_request', 400)
  return value
}

export function snapshotId(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9/_.:-]*$/.test(value))
    throw new ProviderError('invalid_response', 502)
  return value
}

export function secretToken(value: unknown): string {
  if (typeof value !== 'string' || !/^[\x21-\x7e]+$/.test(value))
    throw new ProviderError('invalid_response', 502)
  return value
}
