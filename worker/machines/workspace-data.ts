import type { ComputerIdentity } from '../lifecycle/computer-ledger'
import { workspaceMachineOwner } from './client'
import type { MachineOwner } from './identity'

export async function computerMachineOwner(
  db: D1Database,
  orgId: string,
  computer: ComputerIdentity,
): Promise<MachineOwner | null> {
  const row = await db
    .prepare(
      `SELECT purpose_id AS workspaceId FROM computer_ledger WHERE org_id = ? AND provider_account = ?
     AND sandbox_id = ? AND purpose = 'workspace' AND deleted_at IS NULL AND create_rejected = 0 ORDER BY id DESC LIMIT 1`,
    )
    .bind(orgId, computer.providerAccount, computer.sandboxId)
    .first<{ workspaceId: string }>()
  return row ? workspaceMachineOwner(orgId, row.workspaceId) : null
}

export async function workspaceMachineOwnerById(
  db: D1Database,
  workspaceId: string,
): Promise<MachineOwner | null> {
  const row = await db
    .prepare('SELECT org_id AS orgId FROM workspaces WHERE id = ?')
    .bind(workspaceId)
    .first<{ orgId: string }>()
  return row ? workspaceMachineOwner(row.orgId, workspaceId) : null
}
