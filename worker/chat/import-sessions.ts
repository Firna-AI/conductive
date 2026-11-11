import type { AgentChoice } from '../../src/shared/agents'
import type { MessageSender } from '../../src/shared/messages'
import type { ImportSessionMetadata } from '../../src/shared/import-session'
import type { ChatDependencies } from './types'
import type { ChatTransaction } from './store'
import { createSession } from './sessions'

export interface SeedImportSession {
  id: string
  starter: MessageSender
  choice: AgentChoice
  title?: string | null
  createdAt?: number
  conductorImport?: ImportSessionMetadata
}

export async function seedImportSession(
  transaction: ChatTransaction,
  input: SeedImportSession,
  dependencies: ChatDependencies,
) {
  const old = await transaction.session(input.id)
  if (old) {
    if (
      old.startedBy?.id !== input.starter.id ||
      old.conductorImport?.documentId !== input.conductorImport?.documentId
    )
      throw new Error('The imported session identity changed.')
    if (
      input.conductorImport &&
      old.conductorImport?.preparation !== input.conductorImport.preparation
    ) {
      old.conductorImport = input.conductorImport
      await transaction.saveSession(old)
      await transaction.emit({ type: 'session.updated', session: old })
    }
    return old
  }
  const session = await createSession(
    transaction,
    input.choice,
    input.id,
    input.starter,
    dependencies,
  )
  session.title = input.title ?? null
  session.createdAt = input.createdAt ?? session.createdAt
  if (input.conductorImport) session.conductorImport = input.conductorImport
  await transaction.saveSession(session)
  await transaction.emit({ type: 'session.updated', session })
  return session
}
