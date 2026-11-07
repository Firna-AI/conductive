import type { WorkspaceStorage } from './platform-storage'
import type { AppDependencies, AppEnv } from '../env'
import { retrySandboxCleanup } from './cleanup'
import type { DurableLifecycle } from './durable'
import type { ImageCoordinator } from './image-coordinator'
import type { WorkspaceStartCoordinator } from './start-coordinator'

export async function runWorkspaceAlarm(input: {
  storage: WorkspaceStorage
  env: AppEnv
  dependencies: AppDependencies
  images: ImageCoordinator
  starts: WorkspaceStartCoordinator
  lifecycle: DurableLifecycle
}): Promise<void> {
  const { storage, env, dependencies } = input
  if (await input.images.read()) {
    await input.images.alarm()
    return
  }
  if (await input.starts.pending()) {
    try {
      if (!(await input.starts.advance()))
        await storage.setAlarm(dependencies.now() + 1_000)
    } catch {
      await storage.setAlarm(dependencies.now() + 30_000)
    }
    return
  }
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
