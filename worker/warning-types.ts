import type { BuildPhase } from './lifecycle/build-data'
import type { ImageSourceFailureDetails } from './lifecycle/image-sources/failure'
import type { RepairKind } from './lifecycle/repair-data'
import type { WorkspaceStartJob } from './lifecycle/start-types'
import type { WorkspaceArchiveState } from './lifecycle/archive-types'
import type { ContinueJob } from './lifecycle/continue-types'
import type { ContinueStopCause } from './lifecycle/continue-stop-causes'
import type {
  ErrorSummary,
  WarningCode,
  WarningId,
  WarningStreamId,
  WarningTurnEndState,
} from './warning-values'
import type { GatewayCheckErrorKind } from './model-gateway/check-error'
import type { GatewayRefusal } from './model-gateway/errors'
import type { UnexpectedErrorFields } from './unexpected-error'
import type { ActiveTurnWarning } from './warning-active-turn'
import type { SIMPLE_WARNINGS } from './simple-warnings'

/** Where the handling of one runner message failed. */
export const RUNNER_MESSAGE_STAGES = [
  'parse',
  'hello',
  'file_result',
  'event',
  'after_commit',
] as const

export type RunnerMessageStage = (typeof RUNNER_MESSAGE_STAGES)[number]

/** The runner work that a workspace marks just after a runner connects. */
export const RUNNER_WORK_KINDS = [
  'hello',
  'event',
  'file_result',
  'move_refused',
  'flush',
] as const

type RunnerWorkKind = (typeof RUNNER_WORK_KINDS)[number]

/** Values that `runner_work_interrupted` checks again before it logs them. */
export interface RunnerWorkFields {
  work: RunnerWorkKind | 'unknown'
  stage: RunnerMessageStage | null
  eventType: string | null
  eventNumber: number | null
  size: number | null
}

/** The provider step of a file check or download into a cloud computer. */
export const ATTACHMENT_STEPS = ['check', 'start', 'status', 'command'] as const

export type AttachmentStep = (typeof ATTACHMENT_STEPS)[number]

export interface RunnerWarningFields {
  workspaceId: WarningId
  connectionId: WarningId | null
  streamId: WarningStreamId | null
  processStartId: WarningStreamId | null
  protocolVersion: number | null
}

/** Each kind permits only its fixed text and the safe values that it needs. */
export type WorkerWarning =
  | (RunnerWarningFields & {
      kind: 'runner_connected' | 'runner_disconnected'
    })
  | (RunnerWarningFields &
      RunnerWorkFields & { kind: 'runner_work_interrupted' })
  | (RunnerWarningFields & {
      kind: 'turn_ended_without_stop_request'
      turnId: WarningId
      state: WarningTurnEndState
    })
  | {
      kind: 'model_gateway_check_failed'
      workspaceId: WarningId
      errorKind: GatewayCheckErrorKind
    }
  | {
      kind: 'model_gateway_answer_ended'
      workspaceId: WarningId
      code: GatewayRefusal | GatewayCheckErrorKind | 'lease_expired'
    }
  | {
      kind: 'workspace_archive_failed'
      workspaceId: WarningId
      phase: WorkspaceArchiveState['phase']
      error: ErrorSummary
    }
  | { kind: keyof typeof SIMPLE_WARNINGS }
  | ActiveTurnWarning
  | {
      kind:
        | 'invitation_email_delivery_failed'
        | 'approval_email_delivery_failed'
        | 'feedback_email_delivery_failed'
      error: ErrorSummary
    }
  | { kind: 'runner_protocol_version_mismatch'; workspaceId: WarningId }
  | {
      kind: 'runner_repository_move_refused'
      workspaceId: WarningId
      reason: 'unknown_folder' | 'not_repository' | 'other'
    }
  | { kind: 'repository_change_settle_failed'; workspaceId: WarningId }
  | {
      kind: 'repository_change_ended'
      workspaceId: WarningId
      phase: 'move' | 'publish'
    }
  | {
      kind: 'workspace_title_request_failed' | 'workspace_title_save_failed'
      error: ErrorSummary
    }
  | {
      kind: 'workspace_start_failed'
      workspaceId: WarningId
      phase: WorkspaceStartJob['phase']
      error: ErrorSummary
    }
  | {
      kind: 'workspace_start_ended'
      workspaceId: WarningId
      phase: WorkspaceStartJob['phase']
      code: WarningCode
      cancelled: boolean
    }
  | {
      kind: 'workspace_continue_ended'
      workspaceId: WarningId
      phase: ContinueJob['phase']
      stopCause: ContinueStopCause
    }
  | {
      kind: 'workspace_first_message_failed'
      workspaceId: WarningId
      error: ErrorSummary
    }
  | {
      kind: 'runner_message_failed'
      workspaceId: WarningId
      stage: RunnerMessageStage
      error: ErrorSummary
    }
  | {
      kind: 'attachment_transfer_retried'
      workspaceId: WarningId
      step: AttachmentStep
      error: ErrorSummary
    }
  | {
      kind: 'attachment_copy_failed'
      workspaceId: WarningId
      step: AttachmentStep | null
      error: ErrorSummary
    }
  | {
      kind: 'automation_report_failed'
      workspaceId: WarningId
      retry: 'scheduled' | 'alarm'
      error: ErrorSummary
    }
  | {
      kind: 'git_credential_failed'
      workspaceId: WarningId | null
      turn: boolean
      error: ErrorSummary
    }
  | {
      kind: 'terminal_start_failed'
      workspaceId: WarningId
      exitCode: number | null
      timedOut: boolean | null
    }
  | {
      kind: 'image_build_failed'
      buildId: WarningId
      phase: BuildPhase
      sourceStep: ImageSourceFailureDetails['sourceStep'] | null
      githubStatus: number | null
      error: ErrorSummary
    }
  | {
      kind: 'lifecycle_repair_limited'
      resource: RepairKind
      limit: number
    }
  | ({ kind: 'unexpected_error' } & UnexpectedErrorFields)
  | {
      kind: 'lifecycle_repair_pending'
      workspaces: number
      orgs: number
    }
