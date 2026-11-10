import { FEEDBACK_PATH, type FeedbackResponse } from '../../src/shared/feedback'
import type { AppDependencies, AppEnv } from '../env'
import type { RequestContext } from '../security/gate'
import { feedbackReplyEmail, reachableFeedbackIds } from './feedback-data'
import { readFeedback } from './feedback-input'
import { sendFeedbackEmail } from './feedback-mail'

export async function feedbackRoute(
  request: Request,
  env: AppEnv,
  context: RequestContext,
  dependencies: AppDependencies,
): Promise<Response | null> {
  if (new URL(request.url).pathname !== FEEDBACK_PATH) return null
  if (request.method === 'GET')
    return Response.json({
      replyEmail: await feedbackReplyEmail(env.DB, context.user.id),
    } satisfies FeedbackResponse)
  if (request.method !== 'POST') return null
  const draft = readFeedback(context.body)
  const [ids, replyEmail] = await Promise.all([
    reachableFeedbackIds(env.DB, context.user.id, draft.context),
    feedbackReplyEmail(env.DB, context.user.id),
  ])
  await sendFeedbackEmail(env, dependencies, {
    user: context.user,
    draft,
    ids,
    replyEmail,
    browser: request.headers.get('User-Agent'),
  })
  return new Response(null, { status: 204 })
}
