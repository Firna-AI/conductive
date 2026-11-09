import type {
  WorkspaceEvent,
  WorkspaceEventEnvelope,
} from '../../src/shared/events'
import { updateWorkspaceTitle } from './queries'
import { applyWorkspaceSessionTitle } from './session-titles'
import type { ChatTransaction } from './store'
import type { ChatDependencies } from './types'

export function canFillWorkspaceTitle(
  workspace: { name: string | null } | null,
): boolean {
  return workspace !== null && workspace.name === null
}

export async function workspaceTitleAvailable(
  transaction: ChatTransaction,
  readWorkspace: ChatDependencies['readAutomaticTitleWorkspace'],
): Promise<boolean> {
  return (
    canFillWorkspaceTitle(await readWorkspace(transaction.workspaceId)) &&
    !(await transaction.lifecycleRecovery()).title
  )
}

export async function storeWorkspaceTitle(
  transaction: ChatTransaction,
  event: Extract<WorkspaceEvent, { type: 'workspace.title' }>,
  readWorkspace: ChatDependencies['readAutomaticTitleWorkspace'],
  occurredAt = transaction.now,
): Promise<WorkspaceEventEnvelope | null> {
  await transaction.repairs.remove(event.type)
  if (!(await workspaceTitleAvailable(transaction, readWorkspace))) return null
  const envelope = await transaction.emit(event, occurredAt)
  await applyWorkspaceSessionTitle(transaction, event.name, occurredAt)
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
