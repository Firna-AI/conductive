import { isRecord } from '../../http'
import { ProviderError, providerError } from '../errors'
import type { Rejection } from './context'

const CODES = new Set([
  'snapshot_filesystem_only_disabled',
  'snapshot_filesystem_only_unsupported_node',
  'sandbox_snapshot_guest_agent_unresponsive',
  'sandbox_capacity_unavailable',
  'sandbox_placement_timeout',
  'sandbox_no_compatible_node',
  'sandbox_create_failed',
  'sandbox_create_refused',
  'internal_server_error',
])

export const PREFLIGHT_REFUSALS = [400, 401, 402, 403, 404] as const

export function controlError(response: Response, body: unknown): ProviderError {
  const code =
    isRecord(body) &&
    typeof body.error_code === 'string' &&
    CODES.has(body.error_code)
      ? body.error_code
      : null
  const base = providerError(response, null)
  const retry = base.retryAfterSeconds
  return new ProviderError(
    base.kind,
    base.status,
    code,
    retry !== null && Number.isSafeInteger(retry) ? retry : null,
  )
}

export function invalidResponse(): never {
  throw new ProviderError('invalid_response', 502)
}

export function pendingOperation(): never {
  throw new ProviderError('unavailable', 503)
}

export function replayRejection(row: Rejection): never {
  if (row.rejectionStatus === null) return invalidResponse()
  const headers = new Headers()
  if (row.rejectionRetrySeconds !== null)
    headers.set('Retry-After', String(row.rejectionRetrySeconds))
  throw controlError(
    new Response(null, { status: row.rejectionStatus, headers }),
    { error_code: row.rejectionCode },
  )
}

export function definitiveFailure(error: unknown): error is MutationRefusal {
  return error instanceof MutationRefusal
}

class MutationRefusal extends ProviderError {
  readonly retryable: boolean

  constructor(error: ProviderError, retryable: boolean) {
    super(error.kind, error.status, error.providerCode, error.retryAfterSeconds)
    this.retryable = retryable
  }
}

export function preflightRefusal(status: number | null): boolean {
  return (
    status !== null &&
    PREFLIGHT_REFUSALS.some((candidate) => candidate === status)
  )
}

export function mutationError(
  response: Response,
  body: unknown,
): ProviderError {
  const error = controlError(response, body)
  if (response.headers.get('Should-Retry') === 'true')
    return new MutationRefusal(error, true)
  if (preflightRefusal(response.status))
    return new MutationRefusal(error, false)
  return error
}
