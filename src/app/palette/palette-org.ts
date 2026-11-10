import type { OrgSummary } from '../../shared/orgs'
import { keptOrg } from '../kept-org'
import { routeOrgId, type Route } from '../router'

/**
 * The org that the palette works on: the org of the page, when the person
 * has it and it is not deleted. The palette treats a deleted org as
 * absent, so its page works as a page without an org: on the kept org of
 * the tab, as `keptOrg` says. Without such an org, there is none.
 */
export function paletteOrg(
  route: Route,
  orgs: readonly OrgSummary[],
  lastOrgId: string | null,
): OrgSummary | null {
  const orgId = routeOrgId(route)
  const own = orgs.find((org) => org.id === orgId && !org.deletion)
  return own ?? keptOrg(orgs, lastOrgId) ?? null
}
