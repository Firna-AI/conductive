import type { AppDependencies, AppEnv } from '../env'
import { createMailSender } from '../mail-sender'
import { errorSummary } from '../warning-values'
import { warnWorker } from '../warnings'
import {
  APPROVAL_RETRY_WINDOW,
  finishApprovalEmail,
  pendingApprovalEmail,
  pendingApprovalUsers,
} from './approval-data'

export async function sendApprovalEmail(
  env: AppEnv,
  dependencies: AppDependencies,
  userId: string,
): Promise<boolean> {
  const email = await pendingApprovalEmail(env.DB, userId)
  if (!email) return false
  const now = dependencies.now()
  if (now >= email.approvedAt + APPROVAL_RETRY_WINDOW) {
    await finishApprovalEmail(env.DB, userId, 'failed', now)
    return true
  }
  try {
    await createMailSender(env, dependencies.fetch).send({
      recipient: email.recipient,
      subject: email.subject,
      text: email.body,
      deliveryKey: async () => `waitlist-approval/${userId}`,
      developmentLog: `Approval email to ${email.recipient}: ${email.subject}\n${email.body}`,
    })
  } catch (error) {
    warnWorker({
      kind: 'approval_email_delivery_failed',
      error: errorSummary(error),
    })
    return true
  }
  await finishApprovalEmail(env.DB, userId, 'sent', dependencies.now())
  return false
}

export async function retryApprovalEmails(
  env: AppEnv,
  dependencies: AppDependencies,
) {
  const users = await pendingApprovalUsers(env.DB)
  for (const { userId } of users)
    await sendApprovalEmail(env, dependencies, userId)
}
