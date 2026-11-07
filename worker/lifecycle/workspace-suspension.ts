import {
  suspendedWorkspace,
  suspendedWorkspaceOwnerError,
} from '../data/user-access'
import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
import type { DurableLifecycle } from './durable'
import type { WorkspaceStorage } from './platform-storage'
import type { WorkspaceStartCoordinator } from './start-coordinator'
import type { TurnScopes } from './turns'
import { stopSuspendedWorkspaceSandbox } from './workspace-actions'
import { revokeWorkspacePreviews } from './workspace-data'

export interface WorkspaceSuspensionContext {
  env: AppEnv
  dependencies: AppDependencies
  storage: WorkspaceStorage
  lifecycle: DurableLifecycle
  starts: WorkspaceStartCoordinator
  turns: TurnScopes
}

export async function suspendWorkspaceLifecycle(
  input: WorkspaceSuspensionContext,
  workspaceId: string,
  ownerUserId?: string,
): Promise<boolean | undefined> {
  const row = await suspendedWorkspace(input.env.DB, workspaceId)
  if (!row || (ownerUserId && row.ownerUserId !== ownerUserId)) return undefined
  const { env, dependencies, storage, lifecycle, starts, turns } = input
  await starts.cancel()
  await revokeWorkspacePreviews(env.DB, workspaceId, dependencies.now())
  if (await starts.pending()) {
    await storage.setAlarm(dependencies.now() + 1_000)
    return false
  }
  try {
    const result = await lifecycle.exclusive(() =>
      stopSuspendedWorkspaceSandbox({
        env,
        dependencies,
        workspaceId,
        orgId: row.orgId,
      }),
    )
    if (result === undefined) return undefined
    if (result === 'pending') {
      await storage.setAlarm(dependencies.now() + 30_000)
      return false
    }
    await turns.clear()
    try {
      if (result === 'error') {
        const error = suspendedWorkspaceOwnerError()
        await lifecycle.fail({
          code: error.code,
          message: error.message,
          log: null,
        })
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
    return true
  } catch {
    await storage.setAlarm(dependencies.now() + 30_000)
    return false
  }
}
