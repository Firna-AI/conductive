import type { AppDependencies, AppEnv } from './env'
import { runWorkerCron } from './error-reporting/entry'
import { workerErrorRuntime } from './error-reporting/production'
import { captureWorkerWarning } from './error-reporting/policy'
import { cleanupDeletedOrgs } from './members/cleanup'
import { productionMembersHooks } from './members/composition'
import { repairLifecycleAlarms } from './lifecycle/repair'
import { repairSoftwareImages } from './software-image/repair'
import { imageRuntime, workspaceRuntime } from './lifecycle/runtime'
import { runnerSoftware } from './configuration'
import { retryApprovalEmails } from './operator/approval-email'
import { warnWorker } from './warnings'
import { routineRunRuntime } from './routines/run-runtime'
import { scanRoutineSchedules } from './routines/schedule-scan'
import { cleanupCodexDevices } from './codex-auth/device-store'

export function scheduledWorker(
  env: AppEnv,
  dependencies: AppDependencies,
  execution?: Pick<ExecutionContext, 'waitUntil'>,
  cron = '*/15 * * * *',
): Promise<void> {
  return runWorkerCron(
    workerErrorRuntime(env, dependencies.errorReporting),
    async () => {
      if (cron === '* * * * *') {
        await scanRoutineSchedules(routineRunRuntime(env, dependencies))
        return
      }
      if (cron !== '*/15 * * * *') return
      await cleanupCodexDevices(env.DB, dependencies.now())
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
      try {
        await repairSoftwareImages({ env, dependencies })
      } catch (error) {
        const warning = { kind: 'software_image_repair_failed' } as const
        warnWorker(warning)
        captureWorkerWarning(warning, error)
      }
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
