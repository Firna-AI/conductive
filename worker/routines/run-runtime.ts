import { workspaceBinding } from '../app-api/workspace-state'
import type { AppDependencies, AppEnv } from '../env'
import { workspaceRuntime } from '../lifecycle/runtime'
import type { RoutineRunRuntime } from './run-starter'

export function routineRunRuntime(
  env: AppEnv,
  dependencies: AppDependencies,
): RoutineRunRuntime {
  return {
    ...workspaceRuntime(env, dependencies),
    acceptFirstMessage: (first) =>
      workspaceBinding(env)
        .getByName(first.workspaceId)
        .acceptLifecycleFirstMessage(first),
  }
}
