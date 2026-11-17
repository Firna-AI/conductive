import { API_PATHS, orgPath } from '../shared/api'
import type {
  CreateOrgRequest,
  MoveOrgRequest,
  OrgColorRequest,
  OrgSummary,
  RenameOrgRequest,
} from '../shared/orgs'
import type { ApiClient } from './api/client'
import { ignore, nested, record } from './api/parse'
import { readOrg } from './api/read-core'

/**
 * The requests that create, update, or order orgs. Create and update answers
 * carry the new org record, which `AppModel` puts in the list of the user.
 */

const readOrgResponse = (body: unknown) => nested(record(body), 'org', readOrg)

/** Creates an org with the client of the app. */
export function postOrg(
  api: ApiClient,
  request: CreateOrgRequest,
): Promise<OrgSummary> {
  return api.send('POST', API_PATHS.orgs, request, readOrgResponse)
}

/**
 * Saves the name and the initials of an org, or its colour alone, with the
 * client of the org.
 */
export function patchOrg(
  api: ApiClient,
  orgId: string,
  request: RenameOrgRequest | OrgColorRequest,
): Promise<OrgSummary> {
  return api.send('PATCH', orgPath(orgId), request, readOrgResponse)
}

/** Saves the order of an org with the client of the app. */
export function putOrgOrder(
  api: ApiClient,
  orgId: string,
  index: number,
): Promise<void> {
  const request: MoveOrgRequest = { orgId, index }
  return api.send('PUT', API_PATHS.orgOrder, request, ignore)
}
