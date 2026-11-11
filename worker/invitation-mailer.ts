import { linkWorkerError } from './error-reporting/causes'
import { productName } from '../docs/mockups/src/brand'
import type { AppEnv, HttpFetch } from './env'
import { HttpError } from './http'
import { hash } from './security/crypto'
import { createMailSender } from './mail-sender'

export interface InvitationEmail {
  id: string
  email: string
  orgName: string
  invitedBy: string
  link: string
}

export interface InvitationMailer {
  send(invitation: InvitationEmail): Promise<void>
}

export function invitationLink(appOrigin: string, inviteId: string): string {
  const url = new URL('/', appOrigin)
  url.searchParams.set('invite', inviteId)
  return url.href
}

export function createInvitationMailer(
  env: Pick<AppEnv, 'APP_ORIGIN' | 'RESEND_API_KEY'>,
  fetch: HttpFetch,
): InvitationMailer {
  const sender = createMailSender(env, fetch)
  return {
    async send(invitation) {
      try {
        await sender.send({
          recipient: invitation.email,
          subject: `Join ${invitation.orgName} on ${productName}`,
          text: `${invitation.invitedBy} invited you to join ${invitation.orgName} on ${productName}.\n\nSign in with GitHub and accept your invitation:\n${invitation.link}`,
          deliveryKey: async (body) =>
            `org-invite/${invitation.id}/${await hash(body)}`,
          developmentLog: `${invitation.invitedBy} invited ${invitation.email} to ${invitation.orgName}: ${invitation.link}`,
        })
      } catch (error) {
        throw linkWorkerError(
          new HttpError(
            502,
            'invite_email_failed',
            'The invitation email could not be sent. Try again.',
          ),
          error,
        )
      }
    },
  }
}
