import { productDomain, productName } from '../docs/mockups/src/brand'
import type { CheckedImage, ImageKind } from '../src/shared/images'
import type { AppEnv, HttpFetch } from './env'

interface MailMessage {
  sender?: { name: string; mailbox: 'invites' | 'feedback' }
  recipient: string
  replyTo?: string
  attachments?: readonly CheckedImage[]
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
      const sender = message.sender ?? { name: productName, mailbox: 'invites' }
      const body = JSON.stringify({
        from: `${sender.name} <${sender.mailbox}@mail.${productDomain}>`,
        to: [message.recipient],
        subject: message.subject,
        text: message.text,
        reply_to: message.replyTo,
        attachments: message.attachments?.map((image, index) => ({
          filename: `screenshot-${index + 1}.${imageFormats[image.kind].extension}`,
          content_type: imageFormats[image.kind].mediaType,
          content: imageBase64(image.bytes),
        })),
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

const imageFormats: Record<
  ImageKind,
  { extension: string; mediaType: string }
> = {
  png: { extension: 'png', mediaType: 'image/png' },
  jpeg: { extension: 'jpg', mediaType: 'image/jpeg' },
  gif: { extension: 'gif', mediaType: 'image/gif' },
  webp: { extension: 'webp', mediaType: 'image/webp' },
}

function imageBase64(bytes: Uint8Array): string {
  const chunks: string[] = []
  for (let offset = 0; offset < bytes.length; offset += 8_192)
    chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + 8_192)))
  return btoa(chunks.join(''))
}
