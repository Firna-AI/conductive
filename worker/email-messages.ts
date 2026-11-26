import { productName } from '../src/shared/brand'

interface InvitationDetails {
  id: string
  orgName: string
  invitedBy: string
}

export function createEmailMessages(appOrigin: string) {
  const appLink = new URL('/', appOrigin).href
  const invitationLink = (inviteId: string): string => {
    const url = new URL(appLink)
    url.searchParams.set('invite', inviteId)
    return url.href
  }
  return {
    approval() {
      return {
        subject: `Your ${productName} account is ready`,
        body: `You can now use ${productName}. Sign in with GitHub to get started:\n${appLink}`,
      }
    },
    invitationLink,
    invitation(invitation: InvitationDetails) {
      const link = invitationLink(invitation.id)
      return {
        subject: `Join ${invitation.orgName} on ${productName}`,
        body: `${invitation.invitedBy} invited you to join ${invitation.orgName} on ${productName}.\n\nSign in with GitHub and accept your invitation:\n${link}`,
        link,
      }
    },
  }
}
