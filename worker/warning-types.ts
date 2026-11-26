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

export const SIMPLE_WARNINGS = {
  capability_notes_failed: 'Capability notes could not be kept.',
  capability_notes_unavailable:
    'The workspace object is unavailable. The capability route uses the direct save path.',
  starting_favourite_skipped:
    'An entry of CONDUCTIVE_STARTING_FAVOURITES was skipped.',
  saved_favourites_unreadable:
    'The saved model favourites of an account could not be read. The account uses the starting favourites.',
  starting_favourites_fallback:
    'CONDUCTIVE_STARTING_FAVOURITES has no usable entries. Starting favourites use the app default when available.',
  runner_service_message_invalid:
    'A private service transfer was discarded. The runner connection stays open.',
  runner_service_negotiation_unavailable:
    'Service support could not be negotiated. The runner connection continues without services.',
  image_storage_unmeasured:
    'The free storage of an image build could not be measured. The build continues without it.',
  provider_switch_wake_failed:
    'The provider account switch remains saved for its next image alarm.',
  provider_accounts_invalid:
    'Some sandbox provider accounts are not configured correctly.',
  provider_assignment_weights_recovered:
    'Sandbox provider assignment uses the configured account weights.',
  provider_assignment_choice_ignored:
    'The selected sandbox provider account is unavailable. Assignment uses the account weights.',
  runner_file_server_invalid:
    'A runner hello had an invalid file server announcement. It counts as no file server.',
  workspace_alarm_failed:
    'Workspace alarm work failed. Its durable deadline will retry.',
  files_projection_chunks_discarded:
    'A file projection write discarded damaged chunks.',
  start_record_failed:
    'A job step record of a start could not be saved. The start goes on without it.',
  start_record_send_failed:
    'The job step records of a start could not be sent. The shown state was saved without them.',
  terminal_restart_refresh_failed:
    'The terminal credentials and support could not be refreshed after Restart.',
  automation_schedule_failed:
    'An automation schedule could not run. The next scan will try again.',
  automation_queued_start_failed:
    'A queued automation run could not start. The next scan will try again.',
  automation_background_start_failed:
    'A pull request run could not start in the background.',
  merge_queue_fix_retry:
    'A merge queue fix step failed. The queue alarm will retry it.',
  merge_queue_report_failed:
    'A merge queue turn report failed. The workspace alarm will retry it.',
  merge_queue_merge_retry:
    'A merge queue merge step failed. The queue alarm will retry it.',
  merge_queue_step_retry:
    'A merge queue step failed. The queue alarm will retry it.',
  merge_queue_refresh_failed:
    'The merged pull request was recorded. The workspace GitHub refresh failed.',
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
  approval_email_retry_failed:
    'The retry of approval emails failed. It runs again at the next timer.',
  feedback_send_cleanup_failed:
    'Feedback send record cleanup failed. It runs again at the next timer.',
  codex_device_cleanup_failed:
    'Codex device cleanup failed. It runs again at the next timer.',
  record_cleanup_failed:
    'Record cleanup failed. It runs again at the next timer.',
  lifecycle_alarm_repair_failed:
    'Lifecycle alarm repair failed. It runs again at the next timer.',
  software_image_repair_failed:
    'Software image repair failed. It runs again at the next timer.',
  job_record_cleanup_failed:
    'The deletion of old job step records failed. It runs again at the next timer.',
  merge_queue_list_cleanup_failed:
    'The deletion of expired merge queue list facts failed. It runs again at the next timer.',
  software_image_cleanup_failed:
    'Software image cleanup failed. It runs again at the next timer.',
  attachment_cleanup_retry: 'An attachment cleanup will retry.',
  org_cleanup_failed: 'Deleted-org cleanup will retry.',
  org_cleanup_stop_failed: 'Deleted-org computer stops will retry.',
  org_cleanup_archive_failed: 'Deleted-org Archive deletion will retry.',
  org_cleanup_retention_failed: 'Deleted-org disk retention will retry.',
  org_cleanup_restore_failed: 'Deleted-org Restore handoff will retry.',
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
