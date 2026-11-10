import { HttpError } from '../http'
import { CommandFailed } from '../warnings'
import { JobTimeLimit } from '../lifecycle/job-time-limit'
import type { WorkerWarning } from '../warning-types'
import { isUserCommandFailure } from './causes'
import { captureWorkerFailure } from './scope'
import { RunnerAccessDenied, LoginReuseDenied } from '../chat/login-access'
import { DeviceContractError } from '../../src/shared/device-read'
import type { WorkerClassification } from './types'

export function captureUnexpectedWorkerFailure(
  classification: WorkerClassification,
  error: unknown,
): void {
  if (normalFailure(error)) return
  captureWorkerFailure(classification, error)
}

export function captureWorkerWarning(
  warning: WorkerWarning,
  error?: unknown,
): void {
  switch (warning.kind) {
    case 'error_tracking_dsn_invalid':
    case 'marketing_site_unavailable':
    case 'terminal_start_failed':
    case 'workspace_start_ended':
    case 'workspace_first_message_failed':
    case 'lifecycle_repair_limited':
    case 'lifecycle_repair_pending':
    case 'workspace_title_unconfigured':
    case 'runner_message_failed':
      return
  }
  if (userScriptFailure(warning, error)) return
  if (normalFailure(error)) return
  captureWorkerFailure(warning.kind, error, warning)
}

function userScriptFailure(warning: WorkerWarning, error: unknown): boolean {
  try {
    if (warning.kind === 'image_build_failed' && warning.phase === 'install')
      return (
        (error instanceof CommandFailed && error.state === 'exited') ||
        error instanceof JobTimeLimit
      )
    return (
      warning.kind === 'workspace_start_failed' &&
      warning.phase === 'startup' &&
      error instanceof JobTimeLimit
    )
  } catch {
    return false
  }
}

function normalFailure(error: unknown): boolean {
  try {
    return (
      isUserCommandFailure(error) ||
      (error instanceof HttpError &&
        error.status >= 400 &&
        error.status < 500) ||
      error instanceof RunnerAccessDenied ||
      error instanceof LoginReuseDenied ||
      error instanceof DeviceContractError
    )
  } catch {
    return false
  }
}
