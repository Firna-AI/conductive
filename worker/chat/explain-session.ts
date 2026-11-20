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
import { explanationPrompt } from './explain-prompt'
import { choice, identifier, invalidInput, record, string } from './inputs'
import { acceptMessage } from './messages'
import type { ChatOperation } from './operation'
import { SessionLogins } from './session-login'
import { sessionFor } from './session-record'
import { createSession } from './sessions'
import type { ChatTransaction } from './store'
import type { ChatDependencies } from './types'

function explanationInput(body: unknown): ExplainSessionRequest {
  const input = record(body)
  const selection = {
    messageId: identifier(input.messageId),
    quote: string(input.quote),
    before: string(input.before),
    after: string(input.after),
  }
  if (
    !selection.quote.trim() ||
    selection.quote.length > 2000 ||
    selection.before.length > 300 ||
    selection.after.length > 300
  )
    return invalidInput()
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
  let before: number | undefined
  const through = view.eventNumber
  while (true) {
    const page = await view.newestHistory(sessionId, before, through)
    if (
      page.events.some(
        ({ event }) =>
          event.type === 'assistant.completed' && event.messageId === messageId,
      )
    )
      return
    if (!page.hasMore) break
    before = page.nextBeforeEventNumber
  }
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
    const parent = await sessionFor(view, parentSessionId)
    if (parent.closedAt !== null)
      throw new HttpError(
        409,
        'session_closed',
        'Reopen the session to send a message.',
      )
    await requireMessage(view, parentSessionId, input.messageId)
  })
  const selected = dependencies.normalizeChoice(
    input.choice ??
      (await ownerPreference(env.DB, context.user.id)) ??
      configuredDefaultChoice(env),
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
