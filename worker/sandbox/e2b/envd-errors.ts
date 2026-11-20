import { isRecord } from '../../http'
import { ProviderError, providerError } from '../errors'

const STATUS: Readonly<Record<string, number>> = {
  canceled: 503,
  unknown: 503,
  invalid_argument: 400,
  deadline_exceeded: 504,
  not_found: 404,
  already_exists: 409,
  permission_denied: 403,
  resource_exhausted: 429,
  failed_precondition: 409,
  aborted: 503,
  out_of_range: 400,
  unimplemented: 501,
  internal: 503,
  unavailable: 503,
  data_loss: 503,
  unauthenticated: 401,
}

export function envdError(response: Response, value: unknown): ProviderError {
  const code =
    isRecord(value) &&
    typeof value.code === 'string' &&
    Object.hasOwn(STATUS, value.code)
      ? value.code
      : null
  const base = providerError(response, null)
  return new ProviderError(base.kind, base.status, code, base.retryAfterSeconds)
}

export function connectFailure(value: unknown): never {
  const code =
    isRecord(value) &&
    typeof value.code === 'string' &&
    Object.hasOwn(STATUS, value.code)
      ? value.code
      : null
  const status = code ? STATUS[code] : 503
  const base = providerError(new Response(null, { status }), null)
  throw new ProviderError(base.kind, status, code)
}
