import { API_PATHS, orgPath } from '../shared/api'
import type {
  CreateOrgRequest,
  OrgSummary,
  RenameOrgRequest,
} from '../shared/orgs'
import type { ApiClient } from './api/client'
import { nested, record } from './api/parse'
import { readOrg } from './api/read-core'

/**
 * The requests that create or rename an org. Each answer carries the new
 * record of the org, which `AppModel` then puts in the list of the user.
 */

const readOrgResponse = (body: unknown) => nested(record(body), 'org', readOrg)

/** Creates an org with the client of the app. */
export function postOrg(
  api: ApiClient,
  request: CreateOrgRequest,
): Promise<OrgSummary> {
  return api.send('POST', API_PATHS.orgs, request, readOrgResponse)
}

/** Saves the name and the initials of an org with the client of the org. */
export function patchOrg(
  api: ApiClient,
  orgId: string,
  request: RenameOrgRequest,
): Promise<OrgSummary> {
  return api.send('PATCH', orgPath(orgId), request, readOrgResponse)
}
