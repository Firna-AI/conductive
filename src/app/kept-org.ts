import type { OrgSummary } from '../shared/orgs'

/**
 * The org of a page without one, such as Get started: the org that
 * the person opened last in this tab, or else the first active org.
 * `orgs` comes from `AppModel.activeOrgs`, so it contains no deleted org.
 */
export function keptOrg(
  orgs: readonly OrgSummary[],
  lastOrgId: string | null,
): OrgSummary | undefined {
  return orgs.find((org) => org.id === lastOrgId) ?? orgs[0]
}
