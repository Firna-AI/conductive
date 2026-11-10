import { warningMessage, type WorkerWarning } from './warning-types'
import type { ErrorSummary } from './warning-values'

export type WarningRecord = ReturnType<typeof warningFields>

/** A failed command keeps its state and numbers, with no captured output. */
export class CommandFailed extends Error {
  readonly state: string
  readonly exitCode: number | null
  readonly timedOut: boolean

  constructor(state: string, exitCode: number | null, timedOut: boolean) {
    super('The command failed.')
    this.state = state
    this.exitCode = exitCode
    this.timedOut = timedOut
  }
}

/** Select fields explicitly, because a typed caller can still supply extra fields. */
export function warnWorker(warning: WorkerWarning): void {
  console.warn(warningFields(warning))
}

function warningFields(warning: WorkerWarning) {
  switch (warning.kind) {
    case 'workspace_archive_failed':
      return {
        kind: warning.kind,
        message: warningMessage(warning),
        workspaceId: warning.workspaceId.text,
        phase: warning.phase,
        error: errorFields(warning.error),
      }
    case 'workspace_title_request_failed':
      return {
        kind: warning.kind,
        message: warningMessage(warning),
        error: errorFields(warning.error),
      }
    case 'workspace_title_save_failed':
      return {
        kind: warning.kind,
        message: warningMessage(warning),
        error: errorFields(warning.error),
      }
    case 'workspace_start_failed':
      return {
        kind: warning.kind,
        message: warningMessage(warning),
        workspaceId: warning.workspaceId.text,
        phase: warning.phase,
        error: errorFields(warning.error),
      }
    case 'workspace_start_ended':
      return {
        kind: warning.kind,
        message: warningMessage(warning),
        workspaceId: warning.workspaceId.text,
        phase: warning.phase,
        code: warning.code,
        cancelled: warning.cancelled,
      }
    case 'workspace_first_message_failed':
      return {
        kind: warning.kind,
        message: warningMessage(warning),
        workspaceId: warning.workspaceId.text,
        error: errorFields(warning.error),
      }
    case 'terminal_start_failed':
      return {
        kind: warning.kind,
        message: warningMessage(warning),
        workspaceId: warning.workspaceId.text,
        exitCode: warning.exitCode,
        timedOut: warning.timedOut,
      }
    case 'image_build_failed':
      return {
        kind: warning.kind,
        message: warningMessage(warning),
        buildId: warning.buildId.text,
        phase: warning.phase,
        error: errorFields(warning.error),
      }
    case 'runner_message_failed':
      return {
        kind: warning.kind,
        message: warningMessage(warning),
        workspaceId: warning.workspaceId.text,
        error: errorFields(warning.error),
      }
    case 'runner_protocol_version_mismatch':
      return {
        kind: warning.kind,
        message:
          'The runner closes because its protocol version does not meet the workspace version pin.',
        workspaceId: warning.workspaceId.text,
      }
    case 'lifecycle_repair_limited':
      return {
        kind: warning.kind,
        message: warningMessage(warning),
        resource: warning.resource,
        limit: warning.limit,
      }
    case 'lifecycle_repair_pending':
      return {
        kind: warning.kind,
        message: warningMessage(warning),
        workspaces: warning.workspaces,
        orgs: warning.orgs,
      }
    default:
      return { kind: warning.kind, message: warningMessage(warning) }
  }
}

function errorFields(error: ErrorSummary): ErrorSummary {
  switch (error.kind) {
    case 'provider':
      return {
        kind: error.kind,
        providerKind: error.providerKind,
        status: error.status,
        code: error.code,
      }
    case 'http':
      return { kind: error.kind, status: error.status, code: error.code }
    case 'command':
      return {
        kind: error.kind,
        state: error.state,
        exitCode: error.exitCode,
        timedOut: error.timedOut,
      }
    default:
      return { kind: error.kind }
  }
}
