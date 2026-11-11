import type { WorkerErrorDiagnostic } from './types'

const causes = new WeakMap<object, unknown>()
const responseErrors = new WeakMap<Response, unknown>()
const responseDiagnostics = new WeakMap<Response, WorkerErrorDiagnostic>()
const userFailures = new WeakSet<object>()

export function linkWorkerError<T extends object>(error: T, cause: unknown): T {
  causes.set(error, cause)
  return error
}

export function workerErrorCause(error: unknown): unknown {
  const visited = new Set<unknown>()
  while (typeof error === 'object' && error !== null && causes.has(error)) {
    if (visited.has(error)) break
    visited.add(error)
    error = causes.get(error)
  }
  return error
}

export function userCommandFailure<T extends object>(error: T): T {
  userFailures.add(error)
  return error
}

export function isUserCommandFailure(error: unknown): boolean {
  const cause = workerErrorCause(error)
  return typeof cause === 'object' && cause !== null && userFailures.has(cause)
}

export function rememberResponseError(
  response: Response,
  error: unknown,
): Response {
  responseErrors.set(response, error)
  return response
}

export function responseError(response: Response): unknown {
  return responseErrors.get(response)
}

export function rememberResponseDiagnostic(
  response: Response,
  diagnostic: WorkerErrorDiagnostic,
): Response {
  responseDiagnostics.set(response, diagnostic)
  return response
}

export function responseDiagnostic(
  response: Response,
): WorkerErrorDiagnostic | undefined {
  return responseDiagnostics.get(response)
}

export function transferResponseError(
  source: Response,
  target: Response,
): Response {
  if (responseErrors.has(source))
    responseErrors.set(target, responseErrors.get(source))
  const diagnostic = responseDiagnostics.get(source)
  if (diagnostic) responseDiagnostics.set(target, diagnostic)
  return target
}
