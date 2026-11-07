import type { AppEnv, AppDependencies } from '../env'
import type { WorkspaceController } from './workspace-controller-types'
import { createWorkspaceController } from './workspace-controller'
import { MemoryWorkspaceStorage } from './platform-test-storage'
import type {
  WorkspaceEventPublication,
  WorkspacePlatform,
} from './workspace-platform'

export function backendPlatform(
  env: AppEnv,
  dependencies: AppDependencies,
  changed: () => void,
) {
  const storage = new MemoryWorkspaceStorage()
  const events: WorkspaceEventPublication[] = []
  let observer:
    ((event: WorkspaceEventPublication) => Promise<void>) | undefined
  const platform: WorkspacePlatform = {
    storage,
    blockConcurrencyWhile: (operation) => operation(),
    waitUntil: (promise) => {
      void promise.catch(() => {})
    },
    publish: async (event) => {
      events.push(structuredClone(event))
      await observer?.(event)
    },
  }
  let controller: WorkspaceController = createWorkspaceController(
    env,
    dependencies,
    platform,
  )
  storage.onChange = changed
  return {
    storage,
    events,
    observePublication: (
      value: (event: WorkspaceEventPublication) => Promise<void>,
    ) => {
      observer = value
    },
    endpoint: () => controller,
    restart: () => {
      controller = createWorkspaceController(env, dependencies, platform)
    },
  }
}
