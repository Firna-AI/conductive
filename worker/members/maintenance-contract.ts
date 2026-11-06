import type { LifecycleOwnership } from './lifecycle-contract'

export interface WorkspaceDisk {
  workspaceId: string
  sandboxId: string
  stoppedAt: number
  nextKeepaliveAt: number | null
}

export interface DeletedOrgRetention {
  /** Persist the lifecycle's normal decision-43 deadline. Keep an existing deadline unchanged. */
  schedule(workspaceId: string, nextKeepaliveAt: number): Promise<void>
  /** Only a due disk can restart. Await the bounded resume-and-stop. The capability injects no credentials. */
  restart(
    workspaceId: string,
    ttlSeconds: number,
  ): Promise<{ stoppedAt: number }>
}

export interface DeletedOrgMaintenance {
  ownership: LifecycleOwnership
  orgId: string
  deletedAt: number
  deletesAt: number
  now: number
  /** Restore only plans deadlines. The active lifecycle performs any due restart after activation. */
  mode: 'retention' | 'restore'
  workspaces: readonly WorkspaceDisk[]
  retention: DeletedOrgRetention
}

export interface RestoreOrgMaintenance {
  ownership: LifecycleOwnership
  orgId: string
  requestId: string
  requestedByUserId: string
  requestedAt: number
  deletedAt: number
  deletesAt: number
  now: number
  /** Every workspace receiver needs the Restore generation, including archived or sandbox-free workspaces. */
  workspaceIds: readonly string[]
  workspaces: readonly WorkspaceDisk[]
}

export interface OrgMaintenanceHooks {
  /** Fence every lifecycle write with ownership.generation. Renew cooperatively while making progress. */
  maintainDeletedOrg(input: DeletedOrgMaintenance): Promise<void>
  /** Install this generation and timer plan atomically before activation. Reject older concurrent writes. Start no sandbox. */
  restoreOrgMaintenance(input: RestoreOrgMaintenance): Promise<void>
}
