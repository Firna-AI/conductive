import type { OrgKey } from '../../fixtures/orgs'
import { paths } from '../../paths'

/** The workspace list of each org that the mockups draw. */
export const orgLinks: Readonly<Partial<Record<OrgKey, string>>> = {
  acme: paths.shell,
  firna: paths.newOrg,
  labs: paths.newTeamOrg,
}
