import type { TargetStatus } from '../../fixtures/operatorDirectory'
import { paths } from '../../paths'

/** The page of an org in each state, as the catalogue draws it. */
export const orgPagePaths: Readonly<Record<TargetStatus, string>> = {
  active: paths.operatorOrg,
  suspended: paths.operatorOrgSuspended,
  deleted: paths.operatorOrgDeleted,
}

/** The users in use whose own page the catalogue draws. */
const drawnUserPages: Readonly<Record<string, string>> = {
  'rho-9': paths.operatorUserInviteCode,
  'tide-sam': paths.operatorUserReferralCode,
}

/**
 * The page of a user in use, or of a suspended user. A user in use opens
 * their own page when the catalogue draws it, and others open the page of
 * Dana Kim. A suspended user opens the suspended user that it draws.
 */
export function userPagePath(
  login: string,
  status: 'active' | 'suspended' = 'active',
): string {
  if (status === 'suspended') return paths.operatorUserSuspended
  return drawnUserPages[login] ?? paths.operatorUser
}
