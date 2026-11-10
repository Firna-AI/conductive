import type { AppDependencies, AppEnv } from '../env'
import type { createWorkspaceIntegration } from '../chat/workspace-integration'
import {
  scheduleConnectionCheck,
  type ConnectionScheduler,
} from '../security/connection-access'
import {
  assertReceiverActive,
  LIFECYCLE_FENCE_KEY,
  type ReceiverFence,
} from '../members/receiver-fence'
import { warnWorker } from '../warnings'
import { InputActivityOwner } from './input-activity-owner'
import { inputActivityUpdate } from './input-activity-update'
import type { LifecycleActivityResult } from './workspace-runtime'

export function recordWorkspaceActivity(
  integration: ReturnType<typeof createWorkspaceIntegration>,
  activity: InputActivityOwner,
  at: number,
): Promise<LifecycleActivityResult> {
  return integration.chat.runLifecycle(() =>
    integration.withGeneration(async () => {
      const state = await integration.controller.readLifecycle()
      const result = await integration.controller.lifecycleActivity(true)
      if (result.ok && state) activity.record(state.workspaceId, at)
      return result
    }),
  )
}

export function createWorkspaceInputActivity(
  context: DurableObjectState,
  env: AppEnv,
  dependencies: AppDependencies,
  integration: ReturnType<typeof createWorkspaceIntegration>,
  local: <T>(operation: () => Promise<T>) => Promise<T>,
  schedule: ConnectionScheduler = scheduleConnectionCheck,
) {
  const { controller, storage } = integration
  return new InputActivityOwner({
    now: dependencies.now,
    schedule,
    waitUntil: (pending) => context.waitUntil(pending),
    warn: warnWorker,
    recordLocal: (_id, at) => local(() => controller.recordLifecycleInput(at)),
    update: inputActivityUpdate({
      env,
      dependencies,
      storage,
      extendDeadline: (operation) => controller.extendLifecycleInput(operation),
      capture: (at) =>
        local(async () => {
          await controller.recordLifecycleInput(at)
          return {
            lifecycle: await controller.captureLifecycleActivity(),
            generation:
              (await storage.get<ReceiverFence>(LIFECYCLE_FENCE_KEY))
                ?.generation ?? 0,
          }
        }),
      reconcile: (captured, _sandboxId, remote) =>
        local(async () => {
          await assertReceiverActive(storage, captured.generation)
          if (captured.lifecycle)
            await controller.reconcileLifecycleActivity(
              captured.lifecycle,
              remote,
            )
        }),
    }),
  })
}
