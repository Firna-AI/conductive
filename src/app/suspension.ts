import { ApiError, type ApiClient } from './api/client'
import { record, text } from './api/parse'
import type { Readable } from './store'

/** The code of the API for a request that a suspended org refuses. */
export const orgSuspendedCode = 'org_suspended'

/**
 * The suspension of one org, as the app knows it: from the org list, or
 * from a refusal of the API while the list still shows the org in use.
 */
export interface OrgSuspension {
  /** Whether the operator suspended the org. Screens and models follow it. */
  readonly suspended: Readable<boolean>
  /** Takes a refusal with `org_suspended` for the org. */
  note(): void
}

/** The suspension of an org that nothing can suspend, as in a model test. */
export const neverSuspended: OrgSuspension = {
  suspended: { get: () => false, subscribe: () => () => undefined },
  note: () => undefined,
}

/** Whether an error is the refusal of a suspended org. */
export function isOrgRefusal(error: unknown): boolean {
  return error instanceof ApiError && error.code === orgSuspendedCode
}

/**
 * Whether a reply of the API refuses its request because the org is
 * suspended. It reads a copy of the body, so the caller still reads it.
 */
async function isOrgRefusalReply(response: Response): Promise<boolean> {
  if (response.ok) return false
  try {
    const body: unknown = await response.clone().json()
    const error = record(record(body).error, 'error')
    return text(error, 'code') === orgSuspendedCode
  } catch {
    return false
  }
}

/**
 * The API client of one org. It calls `note` when the API refuses a request
 * because the org is suspended, also a file upload, then it gives the error
 * to the caller. Its fetch, which feature clients such as the files and the
 * members send through, does the same with each reply.
 */
export function noteOrgRefusals(api: ApiClient, note: () => void): ApiClient {
  const watch = async <T>(request: Promise<T>): Promise<T> => {
    try {
      return await request
    } catch (error) {
      if (isOrgRefusal(error)) note()
      throw error
    }
  }
  return {
    fetch: async (input, init) => {
      const response = await api.fetch(input, init)
      if (await isOrgRefusalReply(response)) note()
      return response
    },
    get: (path, read) => watch(api.get(path, read)),
    send: (method, path, body, read) =>
      watch(api.send(method, path, body, read)),
    sendPart: (path, part, read, hooks) =>
      watch(api.sendPart(path, part, read, hooks)),
  }
}
