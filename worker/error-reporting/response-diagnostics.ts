import { knownWorkerErrorCode } from './codes'
import {
  rememberResponseDiagnostic,
  responseDiagnostic,
  responseError,
  transferResponseError,
} from './causes'
import { record, workerErrorDiagnostic, workerFrames } from './frames'
import type { WorkerErrorDiagnostic } from './types'
import { workerErrorClassName } from './class-name'

export const WORKER_ERROR_DIAGNOSTIC_HEADER = 'X-Conductive-Error-Diagnostic'
const MAX_DIAGNOSTIC_BYTES = 16_384

function copyResponse(response: Response, headers: Headers): Response {
  return transferResponseError(
    response,
    new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
      ...(response.webSocket ? { webSocket: response.webSocket } : {}),
    }),
  )
}

export function stripWorkspaceDiagnosticHeader(response: Response): Response {
  if (!response.headers.has(WORKER_ERROR_DIAGNOSTIC_HEADER)) return response
  const headers = new Headers(response.headers)
  headers.delete(WORKER_ERROR_DIAGNOSTIC_HEADER)
  return copyResponse(response, headers)
}

export function workspaceDiagnosticResponse(response: Response): Response {
  const clean = stripWorkspaceDiagnosticHeader(response)
  if (clean.status < 500 || clean.status > 599) return clean
  const cause = responseError(clean)
  const diagnostic =
    responseDiagnostic(clean) ??
    (cause === undefined ? undefined : workerErrorDiagnostic(cause))
  if (!diagnostic) return clean
  try {
    const frames = [...diagnostic.frames]
    let encoded: string
    do {
      encoded = btoa(
        JSON.stringify({
          version: 1,
          type: diagnostic.type,
          frames,
          code: knownWorkerErrorCode(diagnostic.code),
        }),
      )
      if (encoded.length <= MAX_DIAGNOSTIC_BYTES) break
      frames.shift()
    } while (frames.length)
    if (encoded.length > MAX_DIAGNOSTIC_BYTES) return clean
    const headers = new Headers(clean.headers)
    headers.set(WORKER_ERROR_DIAGNOSTIC_HEADER, encoded)
    return copyResponse(clean, headers)
  } catch {
    return clean
  }
}

function readDiagnostic(
  encoded: string | null,
): WorkerErrorDiagnostic | undefined {
  if (!encoded || encoded.length > MAX_DIAGNOSTIC_BYTES) return undefined
  try {
    const input: unknown = JSON.parse(atob(encoded))
    if (!record(input) || input.version !== 1 || !Array.isArray(input.frames))
      return undefined
    return {
      type: workerErrorClassName(input.type),
      frames: workerFrames(input.frames),
      ...(knownWorkerErrorCode(input.code)
        ? { code: knownWorkerErrorCode(input.code) }
        : {}),
    }
  } catch {
    return undefined
  }
}

export function consumeWorkspaceDiagnosticResponse(
  response: Response,
): Response {
  const diagnostic = readDiagnostic(
    response.headers.get(WORKER_ERROR_DIAGNOSTIC_HEADER),
  )
  const headers = new Headers(response.headers)
  headers.delete(WORKER_ERROR_DIAGNOSTIC_HEADER)
  const clean = copyResponse(response, headers)
  return diagnostic && clean.status >= 500 && clean.status <= 599
    ? rememberResponseDiagnostic(clean, diagnostic)
    : clean
}
