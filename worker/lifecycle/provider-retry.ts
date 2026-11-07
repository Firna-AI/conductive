import { ProviderError } from '../sandbox/errors'

export function transientProviderError(error: unknown): boolean {
  return (
    error instanceof ProviderError &&
    ['unavailable', 'invalid_response', 'conflict', 'rate_limited'].includes(
      error.kind,
    )
  )
}
