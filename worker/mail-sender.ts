import { productDomain, productName } from '../docs/mockups/src/brand'
import type { AppEnv, HttpFetch } from './env'

interface MailMessage {
  recipient: string
  subject: string
  text: string
  deliveryKey: (body: string) => Promise<string>
  developmentLog: string
}

export function createMailSender(
  env: Pick<AppEnv, 'APP_ORIGIN' | 'RESEND_API_KEY'>,
  fetch: HttpFetch,
) {
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(
    new URL(env.APP_ORIGIN).hostname,
  )
  return {
    async send(message: MailMessage): Promise<void> {
      if (local) {
        console.info(message.developmentLog)
        return
      }
      if (!env.RESEND_API_KEY) throw new Error('Mail sender is not configured')
      const body = JSON.stringify({
        from: `${productName} <invites@mail.${productDomain}>`,
        to: [message.recipient],
        subject: message.subject,
        text: message.text,
      })
      const response = await fetch(
        new Request('https://api.resend.com/emails', {
          method: 'POST',
          // The Workers runtime throws a TypeError for 'error'. A redirect
          // is not ok, so the send still fails without following it.
          redirect: 'manual',
          signal: AbortSignal.timeout(30_000),
          headers: {
            // Resend requires a User-Agent, and the Workers runtime adds none.
            'User-Agent': productName,
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': await message.deliveryKey(body),
          },
          body,
        }),
      )
      const accepted = response.ok
      await response.body?.cancel()
      if (!accepted) throw new Error('Email was refused')
    },
  }
}
