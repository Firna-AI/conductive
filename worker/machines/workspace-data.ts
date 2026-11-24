import type { ComputerIdentity } from '../lifecycle/computer-ledger'
import { buildMachineOwner, workspaceMachineOwner } from './client'
import type { MachineOwner } from './identity'

export async function computerMachineOwner(
  db: D1Database,
  orgId: string,
  computer: ComputerIdentity,
): Promise<MachineOwner | null> {
  const row = await db
    .prepare(
      `SELECT purpose, purpose_id AS purposeId FROM computer_ledger WHERE org_id = ? AND provider_account = ?
     AND sandbox_id = ? AND purpose IN ('workspace', 'build') AND purpose_id IS NOT NULL
     AND deleted_at IS NULL AND create_rejected = 0 ORDER BY id DESC LIMIT 1`,
    )
    .bind(orgId, computer.providerAccount, computer.sandboxId)
    .first<{ purpose: 'workspace' | 'build'; purposeId: string }>()
  if (!row) return null
  return row.purpose === 'build'
    ? buildMachineOwner(orgId, row.purposeId)
    : workspaceMachineOwner(orgId, row.purposeId)
}
