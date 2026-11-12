import { productName } from '../../docs/mockups/src/brand'
import type { User } from '../../src/shared/api'
import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
import { createMailSender } from '../mail-sender'
import { hash } from '../security/crypto'
import type { FeedbackIds } from './feedback-data'
import type { ParsedFeedback } from './feedback-input'

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
      developmentLog: `Feedback email to ${recipient}: ${subject}\n${text}`,
    })
  } catch {
    throw new HttpError(
      502,
      'feedback_email_failed',
      'The feedback email could not be sent. Try again.',
    )
  }
}
