import { isRecord } from '../http'

export type ProviderErrorKind =
  | 'unauthorized'
  | 'forbidden'
  | 'payment_required'
  | 'not_found'
  | 'conflict'
  | 'rate_limited'
  | 'unavailable'
  | 'invalid_response'
  | 'invalid_request'

export class ProviderError extends Error {
  readonly kind: ProviderErrorKind
  readonly status: number
  readonly providerCode: string | null
  readonly retryAfterSeconds: number | null

  constructor(
    kind: ProviderErrorKind,
    status: number,
    providerCode: string | null = null,
    retryAfterSeconds: number | null = null,
  ) {
    // Never copy upstream messages. They can contain a submitted secret.
    super(`The sandbox provider request failed: ${kind}`)
    this.kind = kind
    this.status = status
    this.providerCode = providerCode
    this.retryAfterSeconds = retryAfterSeconds
  }
}

/** Internal cleanup proof. No dispatched allocation can still appear for this key. */
export class ProviderAllocationAbsent extends ProviderError {
  constructor() {
    super('not_found', 404)
  }
}

export function providerError(
  response: Response,
  body: unknown,
): ProviderError {
  const status = response.status
  const kinds: Record<number, ProviderErrorKind> = {
    400: 'invalid_request',
    401: 'unauthorized',
    402: 'payment_required',
    403: 'forbidden',
    404: 'not_found',
    409: 'conflict',
    429: 'rate_limited',
  }
  const code =
    isRecord(body) && typeof body.code === 'string' ? body.code : null
  const retry = response.headers.get('Retry-After')
  const retryAfter =
    retry !== null && /^\d+$/.test(retry) ? Number(retry) : null
  return new ProviderError(
    kinds[status] ?? 'unavailable',
    status,
    code,
    retryAfter,
  )
}
