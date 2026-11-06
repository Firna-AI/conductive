import { HttpError } from '../http'

export class WorkspaceStartError extends HttpError {
  readonly log: string | null
  constructor(log: string | null) {
    super(
      502,
      'workspace_start_failed',
      'The cloud computer could not start. Try again.',
    )
    this.log = log
  }
}

export function redactStartupLog(
  value: string,
  secrets: readonly string[],
): string {
  let result = value
  for (const secret of [...secrets]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length))
    result = result.replaceAll(secret, '[hidden]')
  return result
}
