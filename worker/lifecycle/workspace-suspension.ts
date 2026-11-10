import { suspendedOrgError } from '../data/org-access'
import {
  readWorkspaceAccessStop,
  suspendedWorkspaceOwnerError,
  type WorkspaceAccessStopRecord,
} from '../data/user-access'
import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
import type { DurableLifecycle } from './durable'
import type { WorkspaceStorage } from './platform-storage'
import type { WorkspaceStartCoordinator } from './start-coordinator'
import type { TurnScopes } from './turns'
import { stopAccessDeniedWorkspaceSandbox } from './workspace-actions'
import { revokeWorkspacePreviews } from './workspace-data'
import { reconciledLifecycle } from './durable-reconciliation'
import { isConfirmedStopped } from './confirmed-stop'
import { retentionResourceAllowed } from './retention-data'
import type { WorkspaceAlarms } from '../features/alarms'
import { hasPendingStartWork } from './start-storage'

export interface WorkspaceSuspensionContext {
  env: AppEnv
  dependencies: AppDependencies
  storage: WorkspaceStorage
  lifecycle: DurableLifecycle
  starts: WorkspaceStartCoordinator
  turns: TurnScopes
  alarms: WorkspaceAlarms
}

export class WorkspaceAccessStop {
  private pending: Promise<unknown> = Promise.resolve()
  private readonly context: () => WorkspaceSuspensionContext

  constructor(context: () => WorkspaceSuspensionContext) {
    this.context = context
  }

  async cancelPending(
    workspaceId: string,
    ownerUserId: string,
  ): Promise<boolean> {
    const input = this.context()
    const row = await readWorkspaceAccessStop(input.env.DB, workspaceId)
    if (
      !(
        row?.orgSuspended ||
        (row?.ownerSuspended && row.ownerUserId === ownerUserId)
      ) ||
      !(await input.starts.pending())
    )
      return false
    await input.starts.cancel()
    await revokeWorkspacePreviews(
      input.env.DB,
      workspaceId,
      input.dependencies.now(),
    )
    if (!(await input.starts.pending())) return false
    await input.storage.setAlarm(input.dependencies.now() + 1_000)
    return true
  }

  check(
    workspaceId: string,
    ownerUserId?: string,
  ): Promise<boolean | undefined> {
    return this.serial(
      async () => (await this.run(workspaceId, ownerUserId)).result,
    )
  }

  ownerChanged(workspaceId: string): Promise<void> {
    return this.serial(async () => {
      const checked = await this.run(workspaceId)
      const state = await checked.input.lifecycle.read()
      const allowed =
        checked.row?.maintenanceAllowed ||
        Boolean(
          checked.row?.state === 'error' &&
          checked.row.sandboxId &&
          state?.workspaceId === workspaceId &&
          state.orgId === checked.row.orgId &&
          isConfirmedStopped(state) &&
          (await retentionResourceAllowed(
            checked.input.env.DB,
            workspaceId,
            checked.row.sandboxId,
            checked.row.providerAccount,
          )),
        )
      if (checked.result === undefined && !checked.startPending && allowed)
        await checked.input.lifecycle.rearmStopped()
    })
  }

  private async run(workspaceId: string, ownerUserId?: string) {
    const input = this.context()
    const row = await readWorkspaceAccessStop(input.env.DB, workspaceId)
    const startPending = await input.starts.pending()
    const ownerStop =
      row?.ownerSuspended && (!ownerUserId || row.ownerUserId === ownerUserId)
    const tokenStop = row?.revokedTokenRunning && !startPending
    const result =
      row && (row.orgSuspended || ownerStop || tokenStop)
        ? await stopForAccess(input, workspaceId, row)
        : undefined
    if (result === undefined) await input.storage.deleteAlarm()
    return { input, row, startPending, result }
  }

  private serial<T>(work: () => Promise<T>): Promise<T> {
    const next = this.pending.then(work)
    this.pending = next.catch(() => undefined)
    return next
  }
}

async function stopForAccess(
  input: WorkspaceSuspensionContext,
  workspaceId: string,
  row: WorkspaceAccessStopRecord,
): Promise<boolean> {
  const { env, dependencies, storage, lifecycle, starts, turns } = input
  if (row.orgSuspended || row.ownerSuspended) await starts.cancel()
  await revokeWorkspacePreviews(env.DB, workspaceId, dependencies.now())
  if (await hasPendingStartWork(storage)) {
    const now = dependencies.now()
    const cleanupAt = (await starts.pending())
      ? undefined
      : await storage.get('number', 'alarm:lifecycle:cleanup')
    await storage.setAlarm(
      cleanupAt !== undefined && cleanupAt > now ? cleanupAt : now + 1_000,
    )
    return false
  }
  try {
    const result = await lifecycle.exclusive(() =>
      stopAccessDeniedWorkspaceSandbox(
        {
          env,
          dependencies,
          workspaceId,
          orgId: row.orgId,
        },
        row.sandboxId,
        row.providerAccount,
      ),
    )
    if (result === 'pending') {
      await lifecycle.endRestoreWatch()
      await storage.setAlarm(dependencies.now() + 30_000)
      return false
    }
    await turns.clear()
    try {
      if (result === 'error' && (row.orgSuspended || row.ownerSuspended)) {
        const error = row.orgSuspended
          ? suspendedOrgError()
          : suspendedWorkspaceOwnerError()
        await lifecycle.fail({
          code: error.code,
          message: error.message,
          log: null,
        })
      } else if (result === 'error') {
        const state = await lifecycle.read()
        if (state)
          await lifecycle.fail(
            reconciledLifecycle(state, 'error', dependencies.now()).error,
          )
      } else await lifecycle.stopped()
    } catch (error) {
      if (!(
        row.orgDeletedAt !== null &&
        error instanceof HttpError &&
        error.code === 'workspace_not_found'
      ))
        throw error
    }
    await storage.deleteAlarm()
    if (row.orgSuspended || row.ownerSuspended) {
      await input.alarms.set('lifecycle', null)
    }
    return true
  } catch {
    await storage.setAlarm(dependencies.now() + 30_000)
    return false
  }
}
