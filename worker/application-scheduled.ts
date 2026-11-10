import type { AppDependencies, AppEnv } from './env'
import { runWorkerCron } from './error-reporting/entry'
import { workerErrorRuntime } from './error-reporting/production'
import { captureWorkerWarning } from './error-reporting/policy'
import { cleanupDeletedOrgs } from './members/cleanup'
import { productionMembersHooks } from './members/composition'
import { repairLifecycleAlarms } from './lifecycle/repair'
import { imageRuntime, workspaceRuntime } from './lifecycle/runtime'
import { runnerSoftware } from './configuration'
import { retryApprovalEmails } from './operator/approval-email'
import { warnWorker } from './warnings'

export function scheduledWorker(
  env: AppEnv,
  dependencies: AppDependencies,
  execution?: Pick<ExecutionContext, 'waitUntil'>,
): Promise<void> {
  return runWorkerCron(
    workerErrorRuntime(env, dependencies.errorReporting),
    async () => {
      await cleanupDeletedOrgs(
        env,
        dependencies,
        productionMembersHooks(env, dependencies),
      )
      await repairLifecycleAlarms(
        workspaceRuntime(env, dependencies),
        imageRuntime(env, dependencies),
        () => runnerSoftware(env),
      )
      // Last, so that a slow or failed email never holds back the repairs.
      try {
        await retryApprovalEmails(env, dependencies)
      } catch (error) {
        const warning = { kind: 'approval_email_retry_failed' } as const
        warnWorker(warning)
        captureWorkerWarning(warning, error)
      }
    },
    execution ? (pending) => execution.waitUntil(pending) : undefined,
  )
}
