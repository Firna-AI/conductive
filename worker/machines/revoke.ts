import type { AppEnv } from '../env'
import type { ComputerIdentity } from '../lifecycle/computer-ledger'
import { revokeMachineToken } from './client'
import type { MachineOwner } from './identity'
import { warnWorker } from '../warnings'
import { computerMachineOwner } from './workspace-data'

export async function revokeMachineTokenOnStop(
  env: AppEnv,
  owner: MachineOwner | (() => Promise<MachineOwner | null>),
  failure: 'warn' | 'retry' = 'warn',
): Promise<void> {
  try {
    const machine = typeof owner === 'function' ? await owner() : owner
    if (machine) await revokeMachineToken(env, machine)
  } catch (error) {
    if (failure === 'retry') throw error
    warnWorker({ kind: 'machine_token_revoke_failed' })
  }
}

export function revokeComputerMachineToken(
  env: AppEnv,
  orgId: string,
  computer: ComputerIdentity,
  failure: 'warn' | 'retry' = 'warn',
): Promise<void> {
  return revokeMachineTokenOnStop(
    env,
    () => computerMachineOwner(env.DB, orgId, computer),
    failure,
  )
}
