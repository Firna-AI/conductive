import { HttpError } from '../http'
import { suspendedUserError } from '../data/user-access'
import type { MaskedStartLog } from './masked-start-log'
import type { WorkspaceStartResult } from './start-types'

export class WorkspaceStartError extends HttpError {
  readonly log: MaskedStartLog | null
  constructor(log: MaskedStartLog | null) {
    super(
      502,
      'workspace_start_failed',
      'The cloud computer could not start. Try again.',
    )
    this.log = log
  }
}

export function workspaceStartFailure(
  error: Extract<WorkspaceStartResult, { ok: false }>['error'],
): HttpError {
  if (error.code === 'user_suspended')
    return Object.assign(suspendedUserError(), { message: error.message })
  return Object.assign(new WorkspaceStartError(error.log), error)
}
