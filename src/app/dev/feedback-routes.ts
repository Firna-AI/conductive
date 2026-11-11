import { FEEDBACK_PATH, type FeedbackResponse } from '../../shared/feedback'
import type { DevBackend } from './backend'
import type { DevOptions } from './options'
import { json, noContent, RouteError, type Route } from './router'

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
        return noContent()
      },
    },
  ]
}
