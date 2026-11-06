import { isObject, readCount, readString } from './guards'

/**
 * Why a read failed. `too-large` carries the size and the limit that the
 * backend sent. `failed` covers HTTP errors, network errors, and replies
 * that do not match the contract.
 */
export type FilesError =
  | { kind: 'too-large'; sizeBytes: number; limitBytes: number }
  | { kind: 'not-found' }
  | { kind: 'failed'; status: number | null; code: string | null }
  | { kind: 'aborted' }

export type FilesResult<T> =
  { ok: true; value: T } | { ok: false; error: FilesError }

export function failure<T>(error: FilesError): FilesResult<T> {
  return { ok: false, error }
}

/** The error that a reply with an error status names in its JSON body. */
export function errorFromBody(status: number, body: unknown): FilesError {
  const error = isObject(body) && isObject(body.error) ? body.error : null
  const code = error ? readString(error, 'code') : null
  if (error && code === 'file_too_large') {
    const sizeBytes = readCount(error, 'sizeBytes')
    const limitBytes = readCount(error, 'limitBytes')
    if (sizeBytes !== null && limitBytes !== null) {
      return { kind: 'too-large', sizeBytes, limitBytes }
    }
  }
  if (code === 'file_not_found') return { kind: 'not-found' }
  return { kind: 'failed', status, code }
}

/** The error of a fetch that threw: an abort, or a network failure. */
export function errorFromThrown(thrown: unknown): FilesError {
  if (thrown instanceof DOMException && thrown.name === 'AbortError') {
    return { kind: 'aborted' }
  }
  return { kind: 'failed', status: null, code: null }
}
