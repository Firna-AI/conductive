import type { OrgSummary } from '../shared/orgs'

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
  const open = orgs.filter((org) => !org.deletion)
  return open.find((org) => org.id === lastOrgId) ?? open[0]
}
