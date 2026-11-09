import { productDomain, productName } from '../docs/mockups/src/brand'
import type { AppEnv, HttpFetch } from './env'
import { HttpError } from './http'
import { hash } from './security/crypto'

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

/**
 * Resend sends only from a domain that it verified. The deployment
 * verifies this subdomain, as `docs/deployment.md` says.
 */
const senderAddress = `invites@mail.${productDomain}`

export function invitationLink(appOrigin: string, inviteId: string): string {
  const url = new URL('/', appOrigin)
  url.searchParams.set('invite', inviteId)
  return url.href
}

/** Development deliberately writes invitation links to the local log. */
function logInvitationMailer(
  log: (message: string) => void = (message) => console.info(message),
): InvitationMailer {
  return {
    async send(invitation) {
      log(
        `${invitation.invitedBy} invited ${invitation.email} to ${invitation.orgName}: ${invitation.link}`,
      )
    },
  }
}

export function createInvitationMailer(
  env: Pick<AppEnv, 'APP_ORIGIN' | 'RESEND_API_KEY'>,
  fetch: HttpFetch,
): InvitationMailer {
  const hostname = new URL(env.APP_ORIGIN).hostname
  if (['localhost', '127.0.0.1', '[::1]'].includes(hostname)) {
    return logInvitationMailer()
  }
  return {
    async send(invitation) {
      try {
        if (!env.RESEND_API_KEY)
          throw new Error('Invitation mailer is not configured')
        const body = JSON.stringify({
          from: `${productName} <${senderAddress}>`,
          to: [invitation.email],
          subject: `Join ${invitation.orgName} on ${productName}`,
          text: `${invitation.invitedBy} invited you to join ${invitation.orgName} on ${productName}.\n\nSign in with GitHub and accept your invitation:\n${invitation.link}`,
        })
        const response = await fetch(
          new Request('https://api.resend.com/emails', {
            method: 'POST',
            redirect: 'error',
            signal: AbortSignal.timeout(30_000),
            headers: {
              Authorization: `Bearer ${env.RESEND_API_KEY}`,
              'Content-Type': 'application/json',
              'Idempotency-Key': `org-invite/${invitation.id}/${await hash(body)}`,
            },
            body,
          }),
        )
        if (!response.ok) throw new Error('Invitation email was refused')
        await response.body?.cancel()
      } catch {
        throw new HttpError(
          502,
          'invite_email_failed',
          'The invitation email could not be sent. Try again.',
        )
      }
    },
  }
}
