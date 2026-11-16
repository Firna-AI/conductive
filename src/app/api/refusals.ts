import { ApiError, type ApiClient } from './client'
import { record, text } from './parse'

/** Whether an error is a refusal of the API with the error code `code`. */
export function isRefusal(error: unknown, code: string): boolean {
  return error instanceof ApiError && error.code === code
}

/**
 * Whether a reply of the API refuses its request with the error code
 * `code`. It reads a copy of the body, so the caller still reads it.
 */
async function isRefusalReply(
  response: Response,
  code: string,
): Promise<boolean> {
  if (response.ok) return false
  try {
    const body: unknown = await response.clone().json()
    const error = record(record(body).error, 'error')
    return text(error, 'code') === code
  } catch {
    return false
  }
}

/**
 * An API client that calls `note` when the API refuses a request with the
 * error code `code`, also a file upload, then gives the error to the
 * caller. Its fetch, which feature clients such as the files and the
 * members send through, does the same with each reply.
 */
export function noteRefusals(
  api: ApiClient,
  code: string,
  note: () => void,
): ApiClient {
  const watch = async <T>(request: Promise<T>): Promise<T> => {
    try {
      return await request
    } catch (error) {
      if (isRefusal(error, code)) note()
      throw error
    }
  }
  return {
    fetch: async (input, init) => {
      const response = await api.fetch(input, init)
      if (await isRefusalReply(response, code)) note()
      return response
    },
    get: (path, read) => watch(api.get(path, read)),
    send: (method, path, body, read) =>
      watch(api.send(method, path, body, read)),
    sendFile: (path, file, read, hooks) =>
      watch(api.sendFile(path, file, read, hooks)),
  }
}
