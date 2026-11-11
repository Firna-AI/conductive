import type { StackFrame } from '@sentry/core'

import type { WorkerWarning } from '../warning-types'

export const failureMessages = {
  request_failed: 'The Worker request failed.',
  workspace_alarm_failed: 'The workspace alarm failed.',
  cron_failed: 'The scheduled Worker run failed.',
  runner_message_failed: 'The workspace runner message failed.',
  org_cleanup_failed: 'The org cleanup failed.',
  lifecycle_repair_failed: 'The lifecycle repair failed.',
  lifecycle_retry_failed: 'The lifecycle operation will retry after a failure.',
  image_alarm_failed: 'The image alarm failed.',
  image_source_cleanup_failed: 'The image source cleanup failed.',
  creation_publication_failed: 'The workspace creation publication failed.',
  creation_checkpoint_failed: 'The workspace creation checkpoint failed.',
  workspace_start_cleanup_failed: 'The workspace start cleanup failed.',
  workspace_projection_failed: 'The workspace state projection failed.',
  workspace_suspension_failed: 'The workspace suspension operation failed.',
  connection_authorization_failed: 'The connection access check failed.',
  preview_authorization_failed: 'The preview access check failed.',
  device_relay_failed: 'The device relay failed.',
  device_state_update_failed: 'The device state update failed.',
  device_message_failed: 'The device message failed.',
  operator_lifecycle_failed: 'The operator lifecycle operation failed.',
  build_log_stream_failed: 'The build log stream failed.',
  background_task_failed: 'The workspace background operation failed.',
  sign_in_access_failed: 'The sign-in access operation failed.',
  default_model_fallback: 'The default model could not load.',
  github_refresh_failed: 'The workspace GitHub refresh failed.',
  attachment_copy_failed: 'The attachment copy failed.',
} as const

export type WorkerClassification =
  keyof typeof failureMessages | WorkerWarning['kind']
type WorkerComponent = 'request' | 'workspace' | 'cron'

interface WorkerRequestDetails {
  method?: string
  route?: string
  ray?: string
  status?: number
}

export interface WorkerCapture {
  component: WorkerComponent
  classification: WorkerClassification
  request?: WorkerRequestDetails
  warning?: WorkerWarning
}

export interface WorkerEventContext extends Omit<WorkerCapture, 'warning'> {
  environment: 'production' | 'development'
  release?: string
  timestamp: number
  errorCode?: string
  warningTags?: Readonly<Record<string, string>>
  diagnostic?: WorkerErrorDiagnostic
}

export interface WorkerErrorDiagnostic {
  type: string
  frames: StackFrame[]
  code?: string
}
