import iconUrl from '../../../brand/web/icon-192.png'
import { appDomain } from '../brand'
import type { ApprovalValues, InvitationValues } from '../emails/emailWords'
import { account, orgs } from './orgs'
import { waitingEmail } from './waitlist'

/**
 * The app icon at the top of each email. A sent email loads it from the
 * app host. The catalogue embeds the same file from `docs/brand/`.
 */
export const emailLogo = iconUrl

/** The address of the app that sent the sample emails. */
const appAddress = `https://${appDomain}/`

/**
 * Cal, an admin of Acme, invites the primary verified email of Sam's GitHub
 * account. An invitation ID is a random token of 43 characters.
 */
export const invitation: InvitationValues = {
  orgName: orgs.acme.name,
  orgInitials: orgs.acme.initials,
  inviterName: account.name,
  inviterLogin: account.login,
  invitedEmail: waitingEmail,
  link: `${appAddress}?invite=Xk2fQ9rTb7LmWp4NcV8hJ3sD6gY1aZ5uE0iO7qR2wTy`,
}

/**
 * The same invitation from an org with a long name, by an admin whose
 * GitHub account has no name, so the login stands alone.
 */
export const longInvitation: InvitationValues = {
  ...invitation,
  orgName: 'Acme Platform Engineering and Developer Experience',
  orgInitials: 'AP',
  inviterName: null,
}

/** The approval of Sam, whose button opens the app. */
export const approval: ApprovalValues = { link: appAddress }
