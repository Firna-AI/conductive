import { requireWritableOrgRequest } from '../security/org-writes'
import { API_PATHS, orgPath } from '../../src/shared/api'
import { orgSettingsPaths } from '../../src/shared/org-settings'
import { deleteOrgPath, restoreOrgPath } from '../../src/shared/orgs'
import type { AppEnv } from '../env'
import { HttpError } from '../http'
import { gate, type RequestContext } from '../security/gate'
import { assertCanChangeSharedSettings, requireOrgMember } from './permissions'

/** Extends the core gate for an admin's deleted-org recovery. */
export async function membersGate(
  request: Request,
  env: AppEnv,
  now: number,
): Promise<RequestContext> {
  const path = new URL(request.url).pathname
  const match = path.match(new RegExp(`^${API_PATHS.orgs}/([^/]+)(?:/|$)`))
  if (!match) return gate(request, env, now)
  // The existing gate performs every identity, host, Origin, and body check.
  // Membership then uses the original path and fresh data, including deleted-org visibility.
  const context = await gate(
    new Request(new URL(API_PATHS.session, request.url), request),
    env,
    now,
    request,
  )
  let orgId: string
  try {
    orgId = decodeURIComponent(match[1])
  } catch {
    throw new HttpError(404, 'org_not_found', 'The org is not available.')
  }
  const allowDeleted =
    (path === orgPath(orgId) && request.method === 'GET') ||
    (path === restoreOrgPath(orgId) && request.method === 'POST') ||
    (path === deleteOrgPath(orgId) && request.method === 'POST')
  const org = await requireOrgMember(
    env.DB,
    orgId,
    context.user.id,
    allowDeleted,
  )
  context.org = org
  await requireWritableOrgRequest(request, env.DB, orgId)
  const writesSharedSettings =
    !['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
    [
      orgSettingsPaths.repositories(orgId),
      orgSettingsPaths.settings(orgId),
      orgSettingsPaths.builds(orgId),
      orgSettingsPaths.refresh(orgId),
    ].includes(path)
  if (writesSharedSettings)
    await assertCanChangeSharedSettings(env.DB, orgId, context.user.id)
  return context
}
