import type { AppEnv } from '../env'
import { HttpError } from '../http'
import {
  machineChannel,
  type CommandRoute,
  type MachineChannel,
} from '../machines/channel'
import { workspaceMachineOwner } from '../machines/client'
import { providerChannel } from '../machines/provider-channel'
import type { SandboxProvider } from '../sandbox/provider'
import { readWorkspace } from './workspace-data'

interface WorkspaceCommandTarget {
  binding: { orgId: string; id: string }
  sandboxId: string
  providerAccount: string
  commandRoute?: CommandRoute
}

export function workspaceCommandChannel(
  env: AppEnv,
  job: WorkspaceCommandTarget,
  provider: SandboxProvider,
): MachineChannel {
  return machineChannel(
    env,
    workspaceMachineOwner(job.binding.orgId, job.binding.id),
    provider,
    job.sandboxId,
  )
}

/** Selects a channel for settling an already started command after an access failure. */
export async function settlementCommandChannel(
  env: AppEnv,
  job: WorkspaceCommandTarget,
  provider: SandboxProvider,
): Promise<MachineChannel | null> {
  const row = await readWorkspace(
    env.DB,
    job.binding.orgId,
    job.binding.id,
  ).catch((error: unknown) => {
    if (error instanceof HttpError && error.code === 'workspace_not_found')
      return null
    throw error
  })
  if (
    row?.sandboxId === job.sandboxId &&
    row.providerAccount === job.providerAccount
  )
    return workspaceCommandChannel(env, job, provider)
  // The host belongs to the current computer. The provider can still reach
  // a command on the old computer by its account and sandbox ID.
  return job.commandRoute === 'host'
    ? null
    : providerChannel(provider, job.sandboxId)
}
