import { productDomain, productName } from '../src/shared/brand'
import type { CheckedImage, ImageKind } from '../src/shared/images'
import type { AppEnv, HttpFetch } from './env'
import { outboundRequest } from './http/outbound-request'
import {
  type MailFailure,
  readMailRefusal,
  requestErrorType,
} from './mail-diagnostics'

interface MailMessage {
  sender?: { name: string; mailbox: 'invites' | 'feedback' }
  recipient: string
  replyTo?: string
  attachments?: readonly CheckedImage[]
  subject: string
  text: string
  deliveryKey: (body: string) => Promise<string>
  beforeSend?: (deliveryKey: string) => Promise<boolean>
  developmentLog: string
}

export type MailDeliveryOutcome = 'sent' | 'rejected' | 'uncertain'

export class MailDeliveryError extends Error {
  readonly outcome: MailDeliveryOutcome
  readonly diagnostic: MailFailure

  constructor(outcome: MailDeliveryOutcome, diagnostic: MailFailure) {
    super('Email delivery failed')
    this.outcome = outcome
    this.diagnostic = diagnostic
  }
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
      if (local && !message.beforeSend) {
        console.info(message.developmentLog)
        return
      }
      if (!local && !env.RESEND_API_KEY)
        throw new MailDeliveryError('rejected', { reason: 'not_configured' })
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
      const deliveryKey = await message.deliveryKey(body)
      if (message.beforeSend && !(await message.beforeSend(deliveryKey))) return
      if (local) {
        console.info(message.developmentLog)
        return
      }
      let request: Request
      let response: Response
      try {
        request = outboundRequest('https://api.resend.com/emails', {
          method: 'POST',
          signal: AbortSignal.timeout(30_000),
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': deliveryKey,
          },
          body,
        })
        response = await fetch(request)
      } catch (error) {
        throw new MailDeliveryError('uncertain', {
          reason: 'request_failed',
          status: null,
          errorType: requestErrorType(error),
        })
      }
      const outcome = response.ok
        ? 'sent'
        : response.status === 408 ||
            response.status === 409 ||
            response.status >= 500
          ? 'uncertain'
          : 'rejected'
      if (!response.ok)
        throw new MailDeliveryError(outcome, {
          reason: 'provider_refused',
          status: response.status,
          ...(await readMailRefusal(response, request.signal)),
        })
      try {
        await response.body?.cancel()
      } catch (error) {
        throw new MailDeliveryError(outcome, {
          reason: 'request_failed',
          status: response.status,
          errorType: requestErrorType(error),
        })
      }
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
