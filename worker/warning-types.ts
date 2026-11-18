import type { BuildPhase } from './lifecycle/build-data'
import type { RepairKind } from './lifecycle/repair-data'
import type { WorkspaceStartJob } from './lifecycle/start-types'
import type { WorkspaceArchiveState } from './lifecycle/archive-types'
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

export const SIMPLE_WARNINGS = {
  runner_file_server_invalid:
    'A runner hello had an invalid file server announcement. It counts as no file server.',
  workspace_alarm_failed:
    'Workspace alarm work failed. Its durable deadline will retry.',
  terminal_restart_refresh_failed:
    'The terminal credentials and support could not be refreshed after Restart.',
  automation_schedule_failed:
    'An automation schedule could not run. The next scan will try again.',
  automation_queued_start_failed:
    'A queued automation run could not start. The next scan will try again.',
  automation_background_start_failed:
    'A pull request run could not start in the background.',
  marketing_site_unavailable: 'The built marketing site is not available.',
  turn_speed_invalid:
    'A turn end had a speed that the Worker does not know. It counts as standard speed.',
  github_app_slug_invalid:
    'GITHUB_APP_SLUG is not a GitHub App slug. The install link uses the default slug.',
  github_installation_status_failed:
    'Could not read GitHub installation status for Get started.',
  first_image_build_start_failed:
    'Could not start the first cloud computer build.',
  added_image_build_start_failed:
    'Could not start the added cloud computer build.',
  repository_image_build_start_failed:
    'Could not start the cloud computer build for the added repository.',
  repository_change_wake_failed:
    'Could not wake the image coordinator after a repository change. Its next alarm checks again.',
  repository_values_check_failed:
    'Could not update the repository values that a GitHub webhook named. The next webhook checks again.',
  github_repository_token_revoke_failed:
    'Could not revoke the token of a repository read. It expires within 1 hour.',
  approval_email_delivery_failed:
    'Approval email delivery failed. The email remains pending.',
  approval_email_retry_failed:
    'The retry of approval emails failed. It runs again at the next timer.',
  software_image_repair_failed:
    'Software image repair failed. It runs again at the next timer.',
  software_image_cleanup_failed:
    'Software image cleanup failed. It runs again at the next timer.',
  attachment_cleanup_retry: 'An attachment cleanup will retry.',
  attachment_upload_cleanup_retry: 'An attachment upload cleanup will retry.',
  activity_timestamp_failed: 'Workspace activity timestamp could not be saved.',
  activity_update_failed: 'Workspace activity update failed.',
  user_activity_failed: 'The last active time of a user could not be saved.',
  workspace_title_unconfigured:
    'The workspace title request was skipped: Workers AI is not configured.',
  shortcut_keys_skipped:
    'Some stored shortcut keys are no longer valid and were skipped.',
  shortcut_change_skipped: 'An unreadable stored shortcut change was skipped.',
  model_gateway_check_late:
    'A model turn check took longer than its interval. The answer keeps streaming.',
} as const

/** Where the handling of one runner message failed. */
export const RUNNER_MESSAGE_STAGES = [
  'parse',
  'hello',
  'file_result',
  'event',
  'after_commit',
] as const

export type RunnerMessageStage = (typeof RUNNER_MESSAGE_STAGES)[number]

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
  | { kind: 'runner_protocol_version_mismatch'; workspaceId: WarningId }
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
