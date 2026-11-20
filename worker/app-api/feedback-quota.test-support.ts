import { expect } from 'vitest'

import { feedbackDraft, type FeedbackFixture } from './feedback.test-support'

export async function fillFeedbackQuota(
  client: FeedbackFixture,
  count = 10,
  prefix = 'fill',
  session = client.member.session,
) {
  const statuses: number[] = []
  for (let index = 0; index < count; index++)
    statuses.push(
      (
        await client.send(
          { ...feedbackDraft(), draftId: `${prefix}-${index}` },
          session,
        )
      ).status,
    )
  expect(statuses).toEqual(Array.from({ length: count }, () => 204))
}

export function quotaRows(client: FeedbackFixture, db: D1Database) {
  return db
    .prepare(
      `SELECT state, first_attempt_at AS firstAttemptAt, reserved_at AS reservedAt,
       active_requests AS activeRequests FROM feedback_sends WHERE user_id = ?
       ORDER BY first_attempt_at, reserved_at`,
    )
    .bind(client.member.user.id)
    .all<{
      state: 'pending' | 'uncertain' | 'sent'
      firstAttemptAt: number
      reservedAt: number
      activeRequests: number
    }>()
}
