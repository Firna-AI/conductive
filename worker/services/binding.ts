import {
  serviceCounter,
  serviceRecord,
  serviceString,
} from '../../src/shared/service-inputs'
import type { ActiveRunner } from '../chat/types'
import type { AppEnv } from '../env'
import { workspaceTarget } from '../previews/access'
import type { WorkspaceAccessTarget } from '../previews/workspace-store'
import type { WorkspaceTarget } from '../previews/types'

export interface ServiceBinding {
  connectionId: string
  generation: number
  workspaceId: string
  orgId: string
  sandboxId: string
  providerAccount: string
}

export function readBinding(value: unknown): ServiceBinding {
  const input = serviceRecord(value)
  return {
    connectionId: serviceString(input.connectionId),
    generation: serviceCounter(input.generation),
    workspaceId: serviceString(input.workspaceId),
    orgId: serviceString(input.orgId),
    sandboxId: serviceString(input.sandboxId),
    providerAccount: serviceString(input.providerAccount),
  }
}

export function serviceBinding(
  active: ActiveRunner,
  target: WorkspaceTarget,
): ServiceBinding {
  if (!target.sandboxId) throw new Error('Missing service computer.')
  return {
    connectionId: active.state.id,
    generation: active.state.generation,
    workspaceId: target.workspaceId,
    orgId: target.orgId,
    sandboxId: target.sandboxId,
    providerAccount: target.providerAccount,
  }
}

export function sameBinding(
  left: ServiceBinding,
  right: ServiceBinding,
): boolean {
  return (
    left.connectionId === right.connectionId &&
    left.generation === right.generation &&
    left.workspaceId === right.workspaceId &&
    left.orgId === right.orgId &&
    left.sandboxId === right.sandboxId &&
    left.providerAccount === right.providerAccount
  )
}

export function sameComputer(
  left: WorkspaceTarget,
  right: WorkspaceTarget,
): boolean {
  return (
    left.workspaceId === right.workspaceId &&
    left.orgId === right.orgId &&
    left.sandboxId === right.sandboxId &&
    left.providerAccount === right.providerAccount
  )
}

export class ServiceConnection {
  private readonly env: AppEnv
  readonly current: () => ActiveRunner | null

  constructor(env: AppEnv, current: () => ActiveRunner | null) {
    this.env = env
    this.current = current
  }

  async target(active: ActiveRunner): Promise<WorkspaceAccessTarget | null> {
    if (
      this.current() !== active ||
      active.state.services !== true ||
      !active.state.streamId
    )
      return null
    if (!(await active.peer.authorize()) || this.current() !== active)
      return null
    const target = await workspaceTarget(
      this.env,
      active.state.workspace.orgId,
      active.state.workspace.id,
    )
    if (
      this.current() !== active ||
      !target.sandboxId ||
      !active.state.serviceBinding ||
      !sameBinding(
        active.state.serviceBinding,
        serviceBinding(active, target),
      ) ||
      target.state === 'stopped' ||
      target.state === 'archived' ||
      target.ownerActive !== 1 ||
      target.orgActive !== 1
    )
      return null
    return target
  }

  async valid(active: ActiveRunner, binding: ServiceBinding): Promise<boolean> {
    const target = await this.target(active)
    return (
      target !== null && sameBinding(binding, serviceBinding(active, target))
    )
  }
}
