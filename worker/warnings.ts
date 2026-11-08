import { ProviderError } from './sandbox/errors'

export function warnWorker(message: string): void {
  console.warn(message)
}

/** A failure summary for the Worker log. Provider errors never carry an upstream message. */
export function errorSummary(error: unknown): string {
  if (error instanceof ProviderError)
    return `${error.message} (status ${error.status}, code ${error.providerCode ?? 'none'})`
  return error instanceof Error
    ? `${error.name}: ${error.message}`
    : 'Unknown error'
}
