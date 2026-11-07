import type { WorkspaceStorage } from './platform-storage'
import type { AppDependencies, AppEnv } from '../env'
import { retrySandboxCleanup } from './cleanup'
import type { DurableLifecycle } from './durable'
import type { ImageCoordinator } from './image-coordinator'
import type { WorkspaceStartCoordinator } from './start-coordinator'
import type { TurnScopes } from './turns'
import { suspendWorkspaceLifecycle } from './workspace-suspension'

export async function runWorkspaceAlarm(input: {
  storage: WorkspaceStorage
  env: AppEnv
  dependencies: AppDependencies
  images: ImageCoordinator
  starts: WorkspaceStartCoordinator
  lifecycle: DurableLifecycle
  turns: TurnScopes
}): Promise<void> {
  const { storage, env, dependencies } = input
  if (await input.images.read()) {
    await input.images.alarm()
    return
  }
  let advancedStart = false
  if (await input.starts.pending()) {
    try {
      if (!(await input.starts.advance())) {
        await storage.setAlarm(dependencies.now() + 1_000)
        return
      }
      advancedStart = true
    } catch {
      await storage.setAlarm(dependencies.now() + 30_000)
      return
    }
  }
  const state = await input.lifecycle.read()
  if (
    state &&
    (await suspendWorkspaceLifecycle(input, state.workspaceId)) !== undefined
  )
    return
  if (advancedStart) return
  const cleanupId = await storage.get('text', 'lifecycle:cleanup')
  if (cleanupId) {
    try {
      if (await retrySandboxCleanup(env, dependencies, cleanupId)) {
        await storage.delete('lifecycle:cleanup')
        return
      }
    } catch {
      /* Keep the ownership record until a later alarm deletes the resource. */
    }
    await storage.setAlarm(dependencies.now() + 30_000)
    return
  }
  try {
    await input.lifecycle.alarm()
  } catch {
    await storage.setAlarm(dependencies.now() + 30_000)
  }
}
