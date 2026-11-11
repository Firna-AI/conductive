import type { OrgSummary } from '../../shared/orgs'
import type { ShortcutCommandId } from '../../shared/shortcut-commands'
import { keptOrg } from '../kept-org'
import { routeOrgId, type Route } from '../router'
import { orgCommand } from './commands'

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

/**
 * The command of the keys of the Switch to row of an org: Switch to org 1
 * to 9 of its place among the orgs of the rail, counted from the top. The
 * palette has no Switch to row for its own org or for a deleted org, so
 * their keys run nothing.
 */
export function switchCommand(
  orgs: readonly OrgSummary[],
  org: OrgSummary,
  palette: OrgSummary | null,
): ShortcutCommandId | null {
  if (org.deletion || org.id === palette?.id) return null
  return orgCommand(orgs.indexOf(org))
}
