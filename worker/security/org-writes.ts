import { leaveOrgPath } from '../../src/shared/orgs'
import { requireActiveOrg } from '../data/user-access'

export async function requireWritableOrgRequest(
  request: Request,
  db: D1Database,
  orgId: string,
): Promise<void> {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return
  if (
    request.method === 'POST' &&
    new URL(request.url).pathname === leaveOrgPath(orgId)
  )
    return
  await requireActiveOrg(db, orgId)
}
