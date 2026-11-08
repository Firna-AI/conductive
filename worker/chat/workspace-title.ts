import type {
  WorkspaceEvent,
  WorkspaceEventEnvelope,
} from '../../src/shared/events'
import { updateWorkspaceTitle } from './queries'
import { applyWorkspaceSessionTitle } from './session-titles'
import type { ChatTransaction } from './store'

export async function storeWorkspaceTitle(
  transaction: ChatTransaction,
  event: Extract<WorkspaceEvent, { type: 'workspace.title' }>,
  occurredAt = transaction.now,
): Promise<WorkspaceEventEnvelope> {
  const envelope = await transaction.emit(event, occurredAt)
  await applyWorkspaceSessionTitle(transaction, event.name, occurredAt)
  await transaction.repairs.remove(event.type)
  return envelope
}

export async function projectWorkspaceTitle(
  db: D1Database,
  envelope: WorkspaceEventEnvelope,
  now: number,
): Promise<void> {
  if (envelope.event.type === 'workspace.title')
    await updateWorkspaceTitle(
      db,
      envelope.workspaceId,
      envelope.event.name,
      now,
    )
}
