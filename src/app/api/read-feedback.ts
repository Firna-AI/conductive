import type { FeedbackResponse } from '../../shared/feedback'
import { record, text } from './parse'

export function readFeedback(value: unknown): FeedbackResponse {
  const reply = record(value, 'feedback')
  return {
    replyEmail: reply.replyEmail === null ? null : text(reply, 'replyEmail'),
  }
}
