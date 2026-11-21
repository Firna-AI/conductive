import { createEmailMessages } from './email-messages'
import type { AppEnv, HttpFetch } from './env'
import { HttpError } from './http'
import { hash } from './security/crypto'
import { createMailSender } from './mail-sender'
import { errorSummary } from './warning-values'
import { warnWorker } from './warnings'

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

export function createInvitationMailer(
  env: Pick<AppEnv, 'APP_ORIGIN' | 'RESEND_API_KEY'>,
  fetch: HttpFetch,
): InvitationMailer {
  const sender = createMailSender(env, fetch)
  const messages = createEmailMessages(env.APP_ORIGIN)
  return {
    async send(invitation) {
      try {
        const message = messages.invitation(invitation)
        await sender.send({
          recipient: invitation.email,
          subject: message.subject,
          text: message.body,
          deliveryKey: async (body) =>
            `org-invite/${invitation.id}/${await hash(body)}`,
          developmentLog: `${invitation.invitedBy} invited ${invitation.email} to ${invitation.orgName}: ${message.link}`,
        })
      } catch (error) {
        warnWorker({
          kind: 'invitation_email_delivery_failed',
          error: errorSummary(error),
        })
        throw new HttpError(
          502,
          'invite_email_failed',
          'The invitation email could not be sent. Try again.',
        )
      }
    },
  }
}
