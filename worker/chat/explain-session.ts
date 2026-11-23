import type {
  ExplainSessionRequest,
  ExplainSessionResponse,
} from '../../src/shared/sessions'

import { sessionLink } from '../../src/shared/session-link'
import { configuredDefaultChoice } from '../app-api/models'
import type { WorkspaceLinkContext } from '../data/workspace-link'
import type { AppEnv } from '../env'
import { HttpError } from '../http'
import type { RequestContext } from '../security/gate'
import { ownerPreference } from '../tools/store'
import { finishedAgentMessage } from './agent-message'
import { explanationPrompt } from './explain-prompt'
import { choice, identifier, invalidInput, record, string } from './inputs'
import { acceptMessage } from './messages'
import type { ChatOperation } from './operation'
import { SessionLogins } from './session-login'
import { sessionFor } from './session-record'
import { createSession } from './sessions'
import type { ChatTransaction } from './store'
import type { ChatDependencies } from './types'

/** The longest quote and the longest text on each side that a record keeps. */
const quoteLimit = 2000
const contextLimit = 300

/**
 * The selection of a request. A longer quote or context is cut, not
 * refused, so a long selection still starts an explanation: the quote
 * keeps its start, the text before keeps its end, and the text after keeps
 * its start, so each stays next to the quote.
 */
function explanationInput(body: unknown): ExplainSessionRequest {
  const input = record(body)
  const quote = string(input.quote)
  if (!quote.trim()) return invalidInput()
  const before = string(input.before)
  const selection = {
    messageId: identifier(input.messageId),
    quote: quote.slice(0, quoteLimit),
    before: before.slice(Math.max(0, before.length - contextLimit)),
    after: string(input.after).slice(0, contextLimit),
  }
  return {
    ...selection,
    ...(input.choice === undefined ? {} : { choice: choice(input.choice) }),
  }
}

async function requireMessage(
  view: ChatTransaction,
  sessionId: string,
  messageId: string,
): Promise<void> {
  if ((await view.message(messageId))?.sessionId === sessionId) return
  if (await finishedAgentMessage(view, sessionId, messageId)) return
  throw new HttpError(404, 'message_not_found', 'The message is not available.')
}

export async function explainSession(
  operation: ChatOperation,
  parentSessionId: string,
  context: RequestContext,
  env: AppEnv,
  dependencies: ChatDependencies,
  presentation: WorkspaceLinkContext,
): Promise<ExplainSessionResponse> {
  const input = explanationInput(context.body)
  await operation.read(async (view) => {
    await sessionFor(view, parentSessionId)
    await requireMessage(view, parentSessionId, input.messageId)
  })
  // Fast mode stays off unless the request asks for it, as a session that
  // `create_session` starts: a press on Explain does not spend a login at
  // the higher price of fast mode.
  const saved =
    (await ownerPreference(env.DB, context.user.id)) ??
    configuredDefaultChoice(env)
  const selected = dependencies.normalizeChoice(
    input.choice ?? { ...saved, fast: false },
  )
  const resolved = await SessionLogins.resolve(
    dependencies,
    context.user.id,
    selected.agent,
  )
  if (!resolved)
    throw new HttpError(
      409,
      'agent_login_required',
      'Connect your agent login to send a message.',
    )
  const { messageId, quote, before, after } = input
  const anchor = { parentSessionId, messageId, quote, before, after }
  const text = explanationPrompt(
    input,
    sessionLink(
      presentation.origin,
      presentation.orgId,
      operation.workspaceId,
      parentSessionId,
    ),
  )
  return operation.change(async (transaction) => {
    const session = await createSession(
      transaction,
      selected,
      dependencies.randomId(),
      context.user,
      dependencies,
      null,
      resolved.owner,
      anchor,
    )
    return acceptMessage(
      transaction,
      session.id,
      {
        id: dependencies.randomId(),
        text,
        choice: selected,
        attachmentIds: [],
      },
      context.user,
      { attachments: [], paths: [] },
      dependencies.randomId,
      dependencies.readAutomaticTitleWorkspace,
    )
  })
}
