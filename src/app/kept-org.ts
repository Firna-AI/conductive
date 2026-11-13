import type { OrgSummary } from '../shared/orgs'

/**
 * The orgs that the person moves between: every org that is not deleted.
 * The rail, the org sheet of a phone, and the keys of Switch to org list
 * these. The Account page lists the deleted orgs, with Restore.
 */
export function activeOrgs(orgs: readonly OrgSummary[]): OrgSummary[] {
  return orgs.filter((org) => !org.deletion)
}

/**
 * The org of a page without one, such as the Account page: the org that
 * the person opened last in this tab, or else the first org that is not
 * deleted. A deleted org is never the kept org. Without an org that is not
 * deleted, there is none.
 */
export function keptOrg(
  orgs: readonly OrgSummary[],
  lastOrgId: string | null,
): OrgSummary | undefined {
  const open = activeOrgs(orgs)
  return open.find((org) => org.id === lastOrgId) ?? open[0]
}
