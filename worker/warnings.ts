import { D1_ERROR_REASONS } from './d1-errors'
import { mailDiagnosticFields } from './mail-diagnostics'
import { runnerWorkFields } from './warning-runner-work'
import { continueEndWarningFields } from './warning-continue'
import {
  ATTACHMENT_STEPS,
  RUNNER_MESSAGE_STAGES,
  SIMPLE_WARNINGS,
  type RunnerWarningFields,
  type WorkerWarning,
} from './warning-types'
import {
  type ErrorSummary,
  warningProtocolVersion,
  warningTurnEndState,
} from './warning-values'

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
    case 'workspace_continue_ended':
      return continueEndWarningFields(warning)
    case 'invitation_email_delivery_failed':
    case 'approval_email_delivery_failed':
    case 'feedback_email_delivery_failed':
      return {
        kind: warning.kind,
        message: {
          invitation_email_delivery_failed:
            'Invitation email delivery failed. The invitation remains saved.',
          approval_email_delivery_failed:
            'Approval email delivery failed. The email remains pending.',
          feedback_email_delivery_failed: 'Feedback email delivery failed.',
        }[warning.kind],
        error: errorFields(warning.error),
      }
    case 'runner_connected':
    case 'runner_disconnected':
      return {
        kind: warning.kind,
        message:
          warning.kind === 'runner_connected'
            ? 'The runner of a workspace connected.'
            : 'The runner of a workspace disconnected.',
        ...runnerFields(warning),
      }
    case 'runner_work_interrupted':
      return {
        kind: warning.kind,
        message: 'The work of a runner message did not finish.',
        ...runnerFields(warning),
        ...runnerWorkFields(warning),
      }
    case 'turn_ended_without_stop_request':
      return {
        kind: warning.kind,
        message: 'A turn ended without a Stop request.',
        ...runnerFields(warning),
        turnId: warning.turnId.text,
        state: warningTurnEndState(warning.state),
      }
    case 'model_gateway_check_failed':
      return {
        kind: warning.kind,
        message: 'A periodic model turn check failed.',
        workspaceId: warning.workspaceId.text,
        errorKind: warning.errorKind,
      }
    case 'model_gateway_answer_ended':
      return {
        kind: warning.kind,
        message: 'The gateway ended a model answer.',
        workspaceId: warning.workspaceId.text,
        code: warning.code,
      }
    case 'workspace_archive_failed':
      return {
        kind: warning.kind,
        message: 'Workspace archive maintenance will retry.',
        workspaceId: warning.workspaceId.text,
        phase: warning.phase,
        error: errorFields(warning.error),
      }
    case 'workspace_title_request_failed':
      return {
        kind: warning.kind,
        message: 'The workspace title request failed.',
        error: errorFields(warning.error),
      }
    case 'workspace_title_save_failed':
      return {
        kind: warning.kind,
        message: 'The workspace title could not be saved.',
        error: errorFields(warning.error),
      }
    case 'workspace_start_failed':
      return {
        kind: warning.kind,
        message: 'A workspace start failed.',
        workspaceId: warning.workspaceId.text,
        phase: warning.phase,
        error: errorFields(warning.error),
      }
    case 'workspace_start_ended':
      return {
        kind: warning.kind,
        message: 'A workspace start ended as failed.',
        workspaceId: warning.workspaceId.text,
        phase: warning.phase,
        code: warning.code,
        cancelled: warning.cancelled,
      }
    case 'workspace_first_message_failed':
      return {
        kind: warning.kind,
        message: 'A workspace could not admit its first message.',
        workspaceId: warning.workspaceId.text,
        error: errorFields(warning.error),
      }
    case 'attachment_transfer_retried':
    case 'attachment_copy_failed':
      return {
        kind: warning.kind,
        message:
          warning.kind === 'attachment_transfer_retried'
            ? 'The cloud computer did not answer a file transfer step. The transfer runs once more.'
            : 'The files of a message did not reach the cloud computer.',
        workspaceId: warning.workspaceId.text,
        step: ATTACHMENT_STEPS.find((step) => step === warning.step) ?? null,
        error: errorFields(warning.error),
      }
    case 'automation_report_failed':
      return {
        kind: warning.kind,
        message:
          warning.retry === 'alarm'
            ? 'An automation run report failed again. The workspace alarm retries it.'
            : 'An automation run report failed after a chat change. The workspace alarm retries it.',
        workspaceId: warning.workspaceId.text,
        retry: warning.retry === 'alarm' ? 'alarm' : 'scheduled',
        error: errorFields(warning.error),
      }
    case 'git_credential_failed':
      return {
        kind: warning.kind,
        message: 'A Git credential request failed.',
        workspaceId: warning.workspaceId?.text ?? null,
        turn: warning.turn,
        error: errorFields(warning.error),
      }
    case 'terminal_start_failed':
      return {
        kind: warning.kind,
        message: 'The terminal of a workspace did not start.',
        workspaceId: warning.workspaceId.text,
        exitCode: warning.exitCode,
        timedOut: warning.timedOut,
      }
    case 'image_build_failed':
      return {
        kind: warning.kind,
        message: 'An image build failed.',
        buildId: warning.buildId.text,
        phase: warning.phase,
        error: errorFields(warning.error),
      }
    case 'runner_message_failed':
      return {
        kind: warning.kind,
        message: 'The runner of a workspace closes after a failed message.',
        workspaceId: warning.workspaceId.text,
        stage:
          RUNNER_MESSAGE_STAGES.find((stage) => stage === warning.stage) ??
          'unknown',
        error: errorFields(warning.error),
      }
    case 'runner_protocol_version_mismatch':
      return {
        kind: warning.kind,
        message:
          'The runner closes because its protocol version is not supported or does not meet the workspace version pin.',
        workspaceId: warning.workspaceId.text,
      }
    case 'runner_repository_move_refused':
      return {
        kind: warning.kind,
        message:
          'The runner refused to move to the repository folder of its workspace.',
        workspaceId: warning.workspaceId.text,
        reason: warning.reason,
      }
    case 'repository_change_settle_failed':
      return {
        kind: warning.kind,
        message:
          'A step after a repository change failed: the second context copy or the terminal folder.',
        workspaceId: warning.workspaceId.text,
      }
    case 'repository_change_ended':
      return {
        kind: warning.kind,
        message:
          'A repository change failed to advance for 10 minutes and ended. The record keeps the old repository and branch.',
        workspaceId: warning.workspaceId.text,
        phase: warning.phase,
      }
    case 'lifecycle_repair_limited':
      return {
        kind: warning.kind,
        message: 'Lifecycle repair limited its checks.',
        resource: warning.resource,
        limit: warning.limit,
      }
    case 'unexpected_error':
      return {
        kind: warning.kind,
        message: 'A request failed with an unexpected error.',
        errorName: warning.errorName,
        knownText: warning.knownText,
        retryable: warning.retryable,
        overloaded: warning.overloaded,
        durableObjectReset: warning.durableObjectReset,
        method: warning.method,
        route: warning.route,
        frames: [...warning.frames],
      }
    case 'lifecycle_repair_pending':
      return {
        kind: warning.kind,
        message: 'Lifecycle repair left checks pending.',
        workspaces: warning.workspaces,
        orgs: warning.orgs,
      }
    default:
      return { kind: warning.kind, message: SIMPLE_WARNINGS[warning.kind] }
  }
}

function runnerFields(warning: RunnerWarningFields) {
  return {
    workspaceId: warning.workspaceId.text,
    connectionId: warning.connectionId?.text ?? null,
    streamId: warning.streamId?.text ?? null,
    processStartId: warning.processStartId?.text ?? null,
    protocolVersion: warningProtocolVersion(warning.protocolVersion),
  }
}

function errorFields(error: ErrorSummary): ErrorSummary {
  switch (error.kind) {
    case 'mail':
      return { kind: 'mail', ...mailDiagnosticFields(error) }
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
    case 'd1':
      return {
        kind: error.kind,
        reason:
          D1_ERROR_REASONS.find((reason) => reason === error.reason) ?? 'other',
      }
    default:
      return { kind: error.kind }
  }
}
