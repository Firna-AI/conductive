import type { ApiErrorBody } from '../../shared/api'
import {
  FEEDBACK_PATH,
  FEEDBACK_SENDS_PER_HOUR,
  type FeedbackResponse,
} from '../../shared/feedback'
import type { DevBackend } from './backend'
import type { DevOptions } from './options'
import { json, noContent, RouteError, type Route } from './router'

/** The wait that the fake gives a send over the limit: 23 minutes 40 seconds. */
const limitWaitMs = 1_420_000

/**
 * The refusal of a send over the limit, as the Worker sends it. The message
 * gives the time in UTC, rounded up to the minute, for an older app.
 */
function limitRefusal(retryAt: number): Response {
  const utc = new Date(Math.ceil(retryAt / 60_000) * 60_000)
    .toISOString()
    .slice(11, 16)
  return json(
    {
      error: {
        code: 'feedback_send_limit',
        message: `You can send up to ${FEEDBACK_SENDS_PER_HOUR} feedback messages an hour. Try again at ${utc} UTC.`,
        retryAt,
      },
    } satisfies ApiErrorBody,
    429,
  )
}

export function feedbackRoutes(
  backend: DevBackend,
  options: DevOptions,
): Route[] {
  let failed = false
  const checkAccess = () => {
    if (!backend.state.waitlist.appAccess)
      throw new RouteError(
        403,
        'access_required',
        'Your account is on the waitlist. Use an invite code to get access.',
      )
  }
  return [
    {
      method: 'GET',
      path: FEEDBACK_PATH,
      answer: () => {
        checkAccess()
        return json({
          replyEmail:
            options.feedback === 'no-email'
              ? null
              : `${backend.state.account.user.githubLogin}@example.com`,
        } satisfies FeedbackResponse)
      },
    },
    {
      method: 'POST',
      path: FEEDBACK_PATH,
      answer: () => {
        checkAccess()
        if (options.feedback === 'fail' && !failed) {
          failed = true
          throw new RouteError(
            502,
            'feedback_email_failed',
            'The feedback email could not be sent. Try again.',
          )
        }
        if (options.feedback === 'limit' && !failed) {
          failed = true
          return limitRefusal(backend.now() + limitWaitMs)
        }
        return noContent()
      },
    },
  ]
}
