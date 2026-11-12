import { HttpError } from './http'
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

const PROVIDER_CODES = [
  'invalid_path',
  'invalid_name',
  'not_found',
  'save_in_progress',
  'delete_confirmation_required',
] as const

const HTTP_CODES = [
  'invalid_input',
  'org_not_found',
  'workspace_not_found',
  'org_suspended',
  'user_suspended',
  'workspace_archived',
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
  | { kind: 'error' | 'unknown' }

/** Keep fixed error kinds, allowlisted codes and states, and numeric outcomes. */
export function errorSummary(error: unknown): ErrorSummary {
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
  return { kind: error instanceof Error ? 'error' : 'unknown' }
}
