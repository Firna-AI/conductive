import { HttpError } from './http'
import { ProviderError } from './sandbox/errors'

export function warnWorker(message: string): void {
  console.warn(message)
}

/** Provider codes that name a known refusal. Other upstream codes stay out of logs. */
const KNOWN_PROVIDER_CODES = new Set([
  'invalid_path',
  'invalid_name',
  'not_found',
  'save_in_progress',
  'delete_confirmation_required',
])

/** A failed image or start command, described only by its state and numbers. */
export class CommandFailed extends Error {
  readonly state: string
  readonly exitCode: number | null
  readonly timedOut: boolean

  constructor(state: string, exitCode: number | null, timedOut: boolean) {
    super('The command failed.')
    this.state = state
    this.exitCode = exitCode
    this.timedOut = timedOut
  }
}

/**
 * A failure summary for the Worker log. It keeps only known codes, states,
 * and numbers. It never copies an error message, command output, or an
 * upstream text, because any of them can hold a secret.
 */
export function errorSummary(error: unknown): string {
  if (error instanceof ProviderError) {
    const code =
      error.providerCode && KNOWN_PROVIDER_CODES.has(error.providerCode)
        ? `, code ${error.providerCode}`
        : ''
    return `provider ${error.kind} (status ${error.status}${code})`
  }
  if (error instanceof HttpError)
    return `${error.code} (status ${error.status})`
  if (error instanceof CommandFailed)
    return `command ${/^[a-z_]+$/.test(error.state) ? error.state : 'unknown'}, exit code ${error.exitCode ?? 'none'}, timed out ${error.timedOut}`
  return error instanceof Error
    ? `${error.constructor.name} error`
    : 'unknown error'
}
