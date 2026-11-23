import type { AppEnv } from '../env'
import type { ComputerIdentity } from '../lifecycle/computer-ledger'
import { revokeMachineToken } from './client'
import type { MachineOwner } from './identity'
import { warnWorker } from '../warnings'
import {
  computerMachineOwner,
  workspaceMachineOwnerById,
} from './workspace-data'

export async function revokeMachineTokenOnStop(
  env: AppEnv,
  owner: MachineOwner | (() => Promise<MachineOwner | null>),
): Promise<void> {
  try {
    const machine = typeof owner === 'function' ? await owner() : owner
    if (machine) await revokeMachineToken(env, machine)
  } catch {
    warnWorker({ kind: 'machine_token_revoke_failed' })
  }
}

export function revokeComputerMachineToken(
  env: AppEnv,
  orgId: string,
  computer: ComputerIdentity,
): Promise<void> {
  return revokeMachineTokenOnStop(env, () =>
    computerMachineOwner(env.DB, orgId, computer),
  )
}

export function revokeWorkspaceMachineToken(
  env: AppEnv,
  workspaceId: string,
): Promise<void> {
  return revokeMachineTokenOnStop(env, () =>
    workspaceMachineOwnerById(env.DB, workspaceId),
  )
}
