import { HttpError } from '../http'

export const IMAGE_BUILD_TIME_LIMIT_MS = 60 * 60 * 1_000
export const WORKSPACE_START_TIME_LIMIT_MS = 20 * 60 * 1_000

export class JobTimeLimit extends HttpError {
  constructor(kind: 'build' | 'start') {
    super(
      502,
      kind === 'start' ? 'workspace_start_failed' : 'image_build_failed',
      kind === 'start'
        ? 'The cloud computer did not start within the 20-minute limit. Try again.'
        : 'The cloud computer image did not build within the 60-minute limit. Check the log and try again.',
    )
  }
}
