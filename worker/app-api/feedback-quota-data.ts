import { FEEDBACK_SENDS_PER_HOUR } from '../../src/shared/feedback'
import type { MailDeliveryOutcome } from '../mail-sender'

const HOUR = 3_600_000
const DAY = 86_400_000

export interface FeedbackClaim {
  id: string
  generation: string
  state: 'pending' | 'uncertain' | 'sent'
}

type QuotaResult =
  | { kind: 'claimed'; claim: FeedbackClaim }
  | { kind: 'limited'; retryAt: number }

export async function claimFeedbackSend(
  db: D1Database,
  userId: string,
  deliveryKey: string,
  now: number,
  token: string,
): Promise<QuotaResult> {
  const values = [userId, deliveryKey, token, now, now - HOUR, now - DAY]
  const results = await db.batch<FeedbackClaim | { retryAt: number | null }>([
    db
      .prepare(
        `INSERT INTO feedback_sends
       (id, user_id, delivery_key, first_attempt_at, reserved_at,
        generation, state, active_requests)
       SELECT ?3, ?1, ?2, ?4, ?4, ?3, 'pending', 1
       WHERE NOT EXISTS (
         SELECT 1 FROM feedback_sends
         WHERE user_id = ?1 AND delivery_key = ?2 AND first_attempt_at > ?6
       ) AND (
         SELECT COUNT(*) FROM feedback_sends
         WHERE user_id = ?1 AND reserved_at > ?5
       ) < ?7
       RETURNING id, generation, state`,
      )
      .bind(...values, FEEDBACK_SENDS_PER_HOUR),
    db
      .prepare(
        `UPDATE feedback_sends
       SET generation = CASE
             WHEN state <> 'sent' AND reserved_at <= ?5 THEN ?3 ELSE generation END,
           state = CASE
             WHEN state = 'pending' AND reserved_at <= ?5 THEN 'uncertain' ELSE state END,
           reserved_at = CASE
             WHEN state <> 'sent' AND reserved_at <= ?5 THEN ?4 ELSE reserved_at END,
           active_requests = CASE
             WHEN state = 'sent' THEN active_requests
             WHEN reserved_at <= ?5 THEN 1 ELSE active_requests + 1 END
       WHERE user_id = ?1 AND delivery_key = ?2 AND first_attempt_at > ?6
         AND id = (
           SELECT id FROM feedback_sends
           WHERE user_id = ?1 AND delivery_key = ?2 AND first_attempt_at > ?6
           ORDER BY first_attempt_at, id LIMIT 1
         )
         AND id <> ?3 AND (
           state = 'sent' OR reserved_at > ?5 OR (
             SELECT COUNT(*) FROM feedback_sends
             WHERE user_id = ?1 AND reserved_at > ?5
           ) < ?7
         )
       RETURNING id, generation, state`,
      )
      .bind(...values, FEEDBACK_SENDS_PER_HOUR),
    db
      .prepare(
        `SELECT MIN(reserved_at) + ?3 AS retryAt FROM feedback_sends
       WHERE user_id = ?1 AND reserved_at > ?2`,
      )
      .bind(userId, now - HOUR, HOUR),
  ])
  const claim = results[0].results[0] ?? results[1].results[0]
  if (claim && 'id' in claim) return { kind: 'claimed', claim }
  const retry = results[2].results[0]
  if (!retry || !('retryAt' in retry) || retry.retryAt === null)
    throw new Error('The feedback quota could not be read')
  return { kind: 'limited', retryAt: retry.retryAt }
}

export async function completeFeedbackSend(
  db: D1Database,
  claim: FeedbackClaim,
  outcome: MailDeliveryOutcome,
): Promise<void> {
  await db.batch([
    db
      .prepare(
        `UPDATE feedback_sends
       SET active_requests = active_requests - 1,
           state = CASE
             WHEN ?3 = 'sent' OR state = 'sent' THEN 'sent'
             WHEN ?3 = 'uncertain' OR state = 'uncertain' THEN 'uncertain'
             ELSE 'pending' END
       WHERE id = ?1 AND generation = ?2 AND active_requests > 0`,
      )
      .bind(claim.id, claim.generation, outcome),
    db
      .prepare(
        `DELETE FROM feedback_sends WHERE id = ? AND generation = ?
       AND state = 'pending' AND active_requests = 0`,
      )
      .bind(claim.id, claim.generation),
  ])
}

export async function cleanupFeedbackSends(
  db: D1Database,
  now: number,
): Promise<void> {
  await db
    .prepare(
      `DELETE FROM feedback_sends
       WHERE first_attempt_at <= ? AND reserved_at <= ?`,
    )
    .bind(now - DAY, now - HOUR)
    .run()
}
