import type { Session, ChangeModelResponse } from '../../src/shared/sessions'
import type { User } from '../../src/shared/api'
import { HttpError } from '../http'
import { choice, draft, identifier } from './inputs'
import { createSession, queueModel } from './sessions'
import type { ChatTransaction } from './store'
import type { ChatDependencies } from './types'

export async function changeModel(
  transaction: ChatTransaction,
  session: Session,
  body: Record<string, unknown> | null,
  user: User,
  dependencies: ChatDependencies,
): Promise<ChangeModelResponse> {
  const next = dependencies.normalizeChoice(choice(body?.choice))
  const savedDraft = draft(body?.draft)
  if (next.agent === session.choice.agent) {
    session.choice = next
    await transaction.saveSession(session)
    await queueModel(transaction, session, dependencies.randomId())
    await transaction.emit({ type: 'session.updated', session })
    return {
      session,
      created: false,
      draft: savedDraft,
      eventNumber: transaction.eventNumber,
    }
  }
  const id = identifier(body?.newSessionId)
  const existing = await transaction.session(id)
  const creation = {
    sourceSessionId: session.id,
    requestedById: user.id,
    choice: next,
    draft: savedDraft,
  }
  if (existing) {
    const original = await transaction.modelSessionCreation(id)
    if (
      !original ||
      original.sourceSessionId !== creation.sourceSessionId ||
      original.requestedById !== user.id ||
      original.choice.agent !== next.agent ||
      original.choice.model !== next.model ||
      original.choice.effort !== next.effort ||
      (original.choice.fast ?? false) !== next.fast ||
      original.draft.text !== savedDraft.text ||
      JSON.stringify(original.draft.attachmentIds) !==
        JSON.stringify(savedDraft.attachmentIds)
    ) {
      throw new HttpError(
        409,
        'session_id_conflict',
        'Open a new session and try again.',
      )
    }
    return {
      session: existing,
      created: true,
      draft: savedDraft,
      eventNumber: transaction.eventNumber,
    }
  }
  const created = await createSession(transaction, next, id, user, dependencies)
  await transaction.saveModelSessionCreation(id, creation)
  return {
    session: created,
    created: true,
    draft: savedDraft,
    eventNumber: transaction.eventNumber,
  }
}
