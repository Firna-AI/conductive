import { d1ErrorReason, type D1ErrorReason } from './d1-errors'
import { HttpError } from './http'
import {
  type MailDiagnosticFields,
  mailDiagnosticFields,
} from './mail-diagnostics'
import { MailDeliveryError } from './mail-sender'
import { machineHttpCodes } from './machines/errors'
import { ProviderError } from './sandbox/errors'
import { CommandFailed } from './warnings'

/** Production IDs come from randomToken: 32 bytes in canonical base64url. */
export class WarningId {
  private readonly value: string

  private constructor(value: string) {
    this.value = value
  }

  static checked(value: string): WarningId {
    return new WarningId(
      /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/.test(value) ? value : 'unknown',
    )
  }

  get text(): string {
    return this.value
  }
}

/** Production runner streams use UUIDs and retain them across process starts. */
export class WarningStreamId {
  private readonly value: string

  private constructor(value: string) {
    this.value = value
  }

  static checked(value: string): WarningStreamId {
    return new WarningStreamId(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
        value,
      )
        ? value
        : 'unknown',
    )
  }

  get text(): string {
    return this.value
  }
}

/** A diagnostic value cannot reject a hello or prevent saved connection restore. */
export function warningProcessStartId(value: unknown): string | null {
  if (value === undefined || value === null) return null
  return WarningStreamId.checked(typeof value === 'string' ? value : 'unknown')
    .text
}

export function warningProtocolVersion(value: number | null): number | null {
  return value !== null && Number.isSafeInteger(value) && value > 0
    ? value
    : null
}

const TURN_END_STATES = ['finished', 'stopped', 'failed'] as const
export type WarningTurnEndState = (typeof TURN_END_STATES)[number]

export function warningTurnEndState(
  value: string,
): WarningTurnEndState | 'unknown' {
  return TURN_END_STATES.find((state) => state === value) ?? 'unknown'
}

/**
 * Fixed provider codes that may appear in logs. The codes after
 * `delete_confirmation_required` are the Boat codes that say why a create,
 * a resume, or a fork failed.
 */
const PROVIDER_CODES = [
  'invalid_path',
  'invalid_name',
  'not_found',
  'save_in_progress',
  'delete_confirmation_required',
  'resume_failed',
  'sandbox_stopping',
  'snapshot_data_expired',
  'type_too_small',
  'no_ready_machine',
  'rate_limited',
  'limit_reached',
  'member_limit_reached',
  'machine_class_plan_required',
  'environment_forbidden',
  'unknown_environment',
] as const

const HTTP_CODES = [
  'invalid_input',
  'org_not_found',
  'workspace_not_found',
  'org_suspended',
  'user_suspended',
  'workspace_archived',
  'nesting_cycle',
  'nesting_limit',
  'workspace_start_failed',
  'workspace_start_stopped',
  'image_build_failed',
  'image_required',
  'build_not_found',
  'coordinator_conflict',
  'runner_hello_mismatch',
  'runner_hello_required',
  'runner_stream_mismatch',
  'workspace_token_refused',
  'current_turn_required',
  'github_reconnect_required',
  'github_refresh_failed',
  'attachment_copy_failed',
  'attachment_missing',
  'attachment_not_found',
  ...machineHttpCodes(),
] as const

export type WarningCode = (typeof HTTP_CODES)[number] | 'unknown'

/** An unknown code changes only the log, never the product operation. */
export function warningCode(value: string): WarningCode {
  return HTTP_CODES.find((code) => code === value) ?? 'unknown'
}

const PROVIDER_KINDS = [
  'unauthorized',
  'forbidden',
  'payment_required',
  'not_found',
  'conflict',
  'rate_limited',
  'unavailable',
  'invalid_response',
  'invalid_request',
] as const

const COMMAND_STATES = ['running', 'exited', 'lost'] as const

export type ErrorSummary =
  | {
      kind: 'provider'
      providerKind: (typeof PROVIDER_KINDS)[number] | 'unknown'
      status: number
      code: (typeof PROVIDER_CODES)[number] | null
    }
  | { kind: 'http'; status: number; code: WarningCode }
  | {
      kind: 'command'
      state: (typeof COMMAND_STATES)[number] | 'unknown'
      exitCode: number | null
      timedOut: boolean
    }
  | { kind: 'd1'; reason: D1ErrorReason }
  | ({ kind: 'mail' } & MailDiagnosticFields)
  | { kind: 'error' | 'unknown' }

/** Keep fixed error kinds, allowlisted codes and states, and numeric outcomes. */
export function errorSummary(error: unknown): ErrorSummary {
  if (error instanceof MailDeliveryError)
    return { kind: 'mail', ...mailDiagnosticFields(error.diagnostic) }
  if (error instanceof ProviderError)
    return {
      kind: 'provider',
      providerKind:
        PROVIDER_KINDS.find((kind) => kind === error.kind) ?? 'unknown',
      status: error.status,
      code: PROVIDER_CODES.find((code) => code === error.providerCode) ?? null,
    }
  if (error instanceof HttpError)
    return { kind: 'http', status: error.status, code: warningCode(error.code) }
  if (error instanceof CommandFailed)
    return {
      kind: 'command',
      state: COMMAND_STATES.find((state) => state === error.state) ?? 'unknown',
      exitCode: error.exitCode,
      timedOut: error.timedOut,
    }
  const reason = d1ErrorReason(error)
  if (reason) return { kind: 'd1', reason }
  return { kind: error instanceof Error ? 'error' : 'unknown' }
}
