import type { ApiClient } from './api/client'
import { isRefusal, noteRefusals } from './api/refusals'
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
  return isRefusal(error, orgSuspendedCode)
}

/**
 * The API client of one org. It calls `note` when the API refuses a request
 * because the org is suspended, as `noteRefusals` says.
 */
export function noteOrgRefusals(api: ApiClient, note: () => void): ApiClient {
  return noteRefusals(api, orgSuspendedCode, note)
}
