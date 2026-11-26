import { productName } from '../../src/shared/brand'
import type { User } from '../../src/shared/api'
import { FEEDBACK_SENDS_PER_HOUR } from '../../src/shared/feedback'
import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
import { createMailSender, MailDeliveryError } from '../mail-sender'
import { hash } from '../security/crypto'
import { errorSummary } from '../warning-values'
import { warnWorker } from '../warnings'
import type { FeedbackIds } from './feedback-data'
import type { ParsedFeedback } from './feedback-input'
import {
  claimFeedbackSend,
  completeFeedbackSend,
  type FeedbackClaim,
} from './feedback-quota-data'

interface FeedbackEmail {
  user: User
  draft: ParsedFeedback
  ids: FeedbackIds
  replyEmail: string | null
  browser: string | null
}

export async function sendFeedbackEmail(
  env: AppEnv,
  dependencies: AppDependencies,
  email: FeedbackEmail,
): Promise<void> {
  const recipient = env.FEEDBACK_EMAIL?.trim()
  if (!recipient)
    throw new HttpError(
      503,
      'feedback_unavailable',
      'Feedback is not available. Try again later.',
    )
  const { user, draft, ids, replyEmail, browser } = email
  const subject = `Feedback from ${user.githubLogin}`
  const text = [
    draft.text,
    '',
    'Context',
    `User ID: ${user.id}`,
    `GitHub login: ${user.githubLogin}`,
    `GitHub ID: ${user.githubId}`,
    `User: ${new URL(`/operator/users/${user.githubId}`, env.APP_ORIGIN).href}`,
    ...(ids.orgId
      ? [
          `Org ID: ${ids.orgId}`,
          `Org: ${new URL(`/operator/orgs/${encodeURIComponent(ids.orgId)}`, env.APP_ORIGIN).href}`,
        ]
      : []),
    ...(ids.workspaceId ? [`Workspace ID: ${ids.workspaceId}`] : []),
    `App version: ${draft.context.appVersion}`,
    `Mac app: ${draft.context.desktop ? 'Yes' : 'No'}`,
    `Browser: ${browser ?? 'Unknown'}`,
  ].join('\n')
  const delivery: { claim: FeedbackClaim | null } = { claim: null }
  try {
    await createMailSender(env, dependencies.fetch).send({
      sender: { name: `${productName} feedback`, mailbox: 'feedback' },
      recipient,
      subject,
      text,
      ...(replyEmail ? { replyTo: replyEmail } : {}),
      ...(draft.screenshots.length ? { attachments: draft.screenshots } : {}),
      deliveryKey: async (body) =>
        `feedback/${await hash(user.id)}/${await hash(draft.draftId)}/${await hash(body)}`,
      beforeSend: async (key) => {
        const quota = await claimFeedbackSend(
          env.DB,
          user.id,
          key,
          dependencies.now(),
          dependencies.randomToken(),
        )
        if (quota.kind === 'limited') {
          const utc = new Date(Math.ceil(quota.retryAt / 60_000) * 60_000)
            .toISOString()
            .slice(11, 16)
          throw new HttpError(
            429,
            'feedback_send_limit',
            `You can send up to ${FEEDBACK_SENDS_PER_HOUR} feedback messages an hour. Try again at ${utc} UTC.`,
            undefined,
            quota.retryAt,
          )
        }
        if (quota.claim.state === 'sent') return false
        delivery.claim = quota.claim
        return true
      },
      developmentLog: `Feedback email to ${recipient}: ${subject}\n${text}`,
    })
  } catch (error) {
    if (delivery.claim) {
      try {
        await completeFeedbackSend(
          env.DB,
          delivery.claim,
          error instanceof MailDeliveryError ? error.outcome : 'uncertain',
        )
      } catch {
        /* The existing claim remains conservative. */
      }
    }
    if (error instanceof HttpError) throw error
    warnWorker({
      kind: 'feedback_email_delivery_failed',
      error: errorSummary(error),
    })
    throw feedbackEmailFailed()
  }
  if (delivery.claim) {
    try {
      await completeFeedbackSend(env.DB, delivery.claim, 'sent')
    } catch (error) {
      warnWorker({
        kind: 'feedback_email_delivery_failed',
        error: errorSummary(error),
      })
      throw feedbackEmailFailed()
    }
  }
}

function feedbackEmailFailed() {
  return new HttpError(
    502,
    'feedback_email_failed',
    'The feedback email could not be sent. Try again.',
  )
}
