import type { BuildPhase } from './lifecycle/build-data'
import type { RepairKind } from './lifecycle/repair-data'
import type { WorkspaceStartJob } from './lifecycle/start-types'
import type { ErrorSummary, WarningCode, WarningId } from './warning-values'

const SIMPLE_WARNINGS = {
  error_tracking_dsn_invalid:
    'Worker error reporting is disabled because its DSN is invalid.',
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
  attachment_cleanup_retry: 'An attachment cleanup will retry.',
  attachment_upload_cleanup_retry: 'An attachment upload cleanup will retry.',
  activity_timestamp_failed: 'Workspace activity timestamp could not be saved.',
  activity_update_failed: 'Workspace activity update failed.',
  workspace_title_unconfigured:
    'The workspace title request was skipped: Workers AI is not configured.',
} as const

/** Each kind permits only its fixed text and the safe values that it needs. */
export type WorkerWarning =
  | { kind: keyof typeof SIMPLE_WARNINGS }
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

const messages = {
  ...SIMPLE_WARNINGS,
  workspace_title_request_failed: 'The workspace title request failed.',
  workspace_title_save_failed: 'The workspace title could not be saved.',
  workspace_start_failed: 'A workspace start failed.',
  workspace_start_ended: 'A workspace start ended as failed.',
  workspace_first_message_failed:
    'A workspace could not admit its first message.',
  terminal_start_failed: 'The terminal of a workspace did not start.',
  image_build_failed: 'An image build failed.',
  runner_message_failed:
    'The runner of a workspace closes after a failed message.',
  lifecycle_repair_limited: 'Lifecycle repair limited its checks.',
  lifecycle_repair_pending: 'Lifecycle repair left checks pending.',
} as const satisfies Record<WorkerWarning['kind'], string>

export function warningMessage(warning: Pick<WorkerWarning, 'kind'>): string {
  return messages[warning.kind]
}

export function isWorkerWarningKind(
  value: unknown,
): value is WorkerWarning['kind'] {
  return typeof value === 'string' && Object.hasOwn(messages, value)
}
