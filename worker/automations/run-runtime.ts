import { workspaceBinding } from '../app-api/workspace-state'
import type { AppDependencies, AppEnv } from '../env'
import { workspaceRuntime } from '../lifecycle/runtime'
import type { AutomationRunRuntime } from './run-starter'

export function automationRunRuntime(
  env: AppEnv,
  dependencies: AppDependencies,
): AutomationRunRuntime {
  return {
    ...workspaceRuntime(env, dependencies),
    acceptFirstMessage: (first) =>
      workspaceBinding(env)
        .getByName(first.workspaceId)
        .acceptLifecycleFirstMessage(first),
  }
}
