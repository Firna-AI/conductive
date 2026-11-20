const MAIL_FAILURE_REASONS = [
  'not_configured',
  'provider_refused',
  'request_failed',
] as const

/** Fixed names from Resend's error reference and its SDK ErrorResponse. */
const RESEND_ERROR_CODES = [
  'invalid_idempotency_key',
  'validation_error',
  'missing_api_key',
  'restricted_api_key',
  'invalid_api_key',
  'invalid_from_address',
  'invalid_access',
  'invalid_region',
  'security_error',
  'internal_server_error',
  'email_above_quota',
  'invalid_permission',
  'suspended_api_key',
  'not_found',
  'method_not_allowed',
  'concurrent_idempotent_requests',
  'forge_not_enabled',
  'invalid_idempotent_request',
  'resource_locked',
  'forge_unavailable',
  'invalid_attachment',
  'invalid_parameter',
  'missing_required_field',
  'missing_required_parameter',
  'return_path_unavailable',
  'daily_quota_exceeded',
  'monthly_quota_exceeded',
  'rate_limit_exceeded',
  'application_error',
  'dns_lookup_failed',
  'service_unavailable',
] as const

const REQUEST_ERROR_TYPES = [
  'Error',
  'TypeError',
  'AbortError',
  'TimeoutError',
] as const

type MailFailureReason = (typeof MAIL_FAILURE_REASONS)[number]
type ResendErrorCode = (typeof RESEND_ERROR_CODES)[number] | 'unknown'
type RequestErrorType = (typeof REQUEST_ERROR_TYPES)[number] | 'unknown'

export type MailFailure =
  | { reason: 'not_configured' }
  | {
      reason: 'provider_refused'
      status: number
      code: ResendErrorCode
      errorType: RequestErrorType | null
    }
  | {
      reason: 'request_failed'
      status: number | null
      errorType: RequestErrorType
    }

export interface MailDiagnosticFields {
  reason: MailFailureReason | 'unknown'
  status: number | null
  code: ResendErrorCode | null
  errorType: RequestErrorType | null
}

export function mailDiagnosticFields(fields: {
  reason?: unknown
  status?: unknown
  code?: unknown
  errorType?: unknown
}): MailDiagnosticFields {
  return {
    reason:
      MAIL_FAILURE_REASONS.find((reason) => reason === fields.reason) ??
      'unknown',
    status:
      typeof fields.status === 'number' &&
      Number.isInteger(fields.status) &&
      fields.status >= 100 &&
      fields.status <= 599
        ? fields.status
        : null,
    code: fields.code == null ? null : resendErrorCode(fields.code),
    errorType:
      fields.errorType == null
        ? null
        : (REQUEST_ERROR_TYPES.find((type) => type === fields.errorType) ??
          'unknown'),
  }
}

export function requestErrorType(error: unknown): RequestErrorType {
  return error instanceof Error || error instanceof DOMException
    ? (REQUEST_ERROR_TYPES.find((type) => type === error.name) ?? 'unknown')
    : 'unknown'
}

function resendErrorCode(value: unknown): ResendErrorCode {
  return RESEND_ERROR_CODES.find((code) => code === value) ?? 'unknown'
}

export async function readMailRefusal(
  response: Response,
  signal: AbortSignal,
): Promise<{ code: ResendErrorCode; errorType: RequestErrorType | null }> {
  const unknown = { code: 'unknown', errorType: null } as const
  if (!response.body) return unknown
  let reader: ReadableStreamDefaultReader<Uint8Array>
  try {
    reader = response.body.getReader()
  } catch (error) {
    return { code: 'unknown', errorType: requestErrorType(error) }
  }
  let abort = () => {}
  const aborted = new Promise<never>((_, reject) => {
    abort = () => reject(signal.reason)
    signal.addEventListener('abort', abort, { once: true })
  })
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    signal.throwIfAborted()
    while (true) {
      const { done, value } = await Promise.race([reader.read(), aborted])
      if (done) break
      size += value.byteLength
      if (size > 8_192) return unknown
      chunks.push(value)
    }
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.byteLength
    }
    try {
      const body: unknown = JSON.parse(new TextDecoder().decode(bytes))
      return {
        code:
          body && typeof body === 'object' && 'name' in body
            ? resendErrorCode(body.name)
            : 'unknown',
        errorType: null,
      }
    } catch {
      return unknown
    }
  } catch (error) {
    return { code: 'unknown', errorType: requestErrorType(error) }
  } finally {
    signal.removeEventListener('abort', abort)
    void reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
}
