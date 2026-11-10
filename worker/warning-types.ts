import type { BuildPhase } from './lifecycle/build-data'
import type { RepairKind } from './lifecycle/repair-data'
import type { WorkspaceStartJob } from './lifecycle/start-types'
import type { WorkspaceArchiveState } from './lifecycle/archive-types'
import type { ErrorSummary, WarningCode, WarningId } from './warning-values'

export const SIMPLE_WARNINGS = {
  routine_schedule_failed:
    'A routine schedule could not run. The next scan will try again.',
  routine_queued_start_failed:
    'A queued routine run could not start. The next scan will try again.',
  routine_background_start_failed:
    'A pull request run could not start in the background.',
  marketing_site_unavailable: 'The built marketing site is not available.',
  github_app_slug_invalid:
    'GITHUB_APP_SLUG is not a GitHub App slug. The install link uses the default slug.',
  github_installation_status_failed:
    'Could not read GitHub installation status for Get started.',
  first_image_build_start_failed:
    'Could not start the first cloud computer build.',
  added_image_build_start_failed:
    'Could not start the added cloud computer build.',
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
  workspace_title_unconfigured:
    'The workspace title request was skipped: Workers AI is not configured.',
} as const

/** Each kind permits only its fixed text and the safe values that it needs. */
export type WorkerWarning =
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
      kind: 'workspace_first_message_failed' | 'runner_message_failed'
      workspaceId: WarningId
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
  | {
      kind: 'lifecycle_repair_pending'
      workspaces: number
      orgs: number
    }
