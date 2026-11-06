import { HttpError } from '../http'
import type { MaskedStartLog } from './masked-start-log'

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
