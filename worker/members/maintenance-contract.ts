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
  orgId: string
  requestId: string
  requestedByUserId: string
  requestedAt: number
  deletedAt: number
  deletesAt: number
  now: number
  workspaces: readonly WorkspaceDisk[]
}

export interface OrgMaintenanceHooks {
  /** Plan decision-43 deadlines and perform only due retention. Await all calls. Keep normal access and agent work suspended. */
  maintainDeletedOrg(input: DeletedOrgMaintenance): Promise<void>
  /** Replace the org's timer plan idempotently. Check active org/current records before timers run. Start no sandbox here. */
  restoreOrgMaintenance(input: RestoreOrgMaintenance): Promise<void>
}
