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
import { captureWorkerWarning } from '../error-reporting/policy'
import { workspaceErrorReporting } from '../error-reporting/workspace'
import { inputActivityUpdate } from './input-activity-update'

export function createWorkspaceInputActivity(
  context: DurableObjectState,
  env: AppEnv,
  dependencies: AppDependencies,
  integration: ReturnType<typeof createWorkspaceIntegration>,
  local: <T>(operation: () => Promise<T>) => Promise<T>,
  schedule: ConnectionScheduler = scheduleConnectionCheck,
) {
  const { controller, storage } = integration
  const reporting = workspaceErrorReporting(
    env,
    (pending) => context.waitUntil(pending),
    dependencies.errorReporting,
  )
  return new InputActivityOwner({
    now: dependencies.now,
    schedule: reporting.schedule(schedule),
    waitUntil: (pending) => context.waitUntil(pending),
    warn: warnWorker,
    onFailure: (warning, error) =>
      reporting.callback(() => captureWorkerWarning(warning, error)),
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
