import type { BuildPhase } from './lifecycle/build-data'
import type { RepairKind } from './lifecycle/repair-data'
import type { WorkspaceStartJob } from './lifecycle/start-types'
import type { ErrorSummary, WarningCode, WarningId } from './warning-values'

export const SIMPLE_WARNINGS = {
  marketing_site_unavailable: 'The built marketing site is not available.',
  github_app_slug_invalid:
    'GITHUB_APP_SLUG is not a GitHub App slug. The install link uses the default slug.',
  github_installation_status_failed:
    'Could not read GitHub installation status for Get started.',
  attachment_cleanup_retry: 'An attachment cleanup will retry.',
  attachment_upload_cleanup_retry: 'An attachment upload cleanup will retry.',
  activity_timestamp_failed: 'Workspace activity timestamp could not be saved.',
  activity_update_failed: 'Workspace activity update failed.',
} as const

/** Each kind permits only its fixed text and the safe values that it needs. */
export type WorkerWarning =
  | { kind: keyof typeof SIMPLE_WARNINGS }
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
