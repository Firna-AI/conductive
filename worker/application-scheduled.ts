import type { AppDependencies, AppEnv } from './env'
import { repairLifecycleAlarms } from './lifecycle/repair'
import { imageRuntime, workspaceRuntime } from './lifecycle/runtime'
import { latestSoftwareRelease } from './lifecycle/software-release'
import { cleanupDeletedOrgs } from './members/cleanup'
import { productionMembersHooks } from './members/composition'
import { retryApprovalEmails } from './operator/approval-email'
import { runRecordCleanups } from './record-cleanups'
import { runScheduledStep } from './scheduled-step'
import { repairSoftwareImages } from './software-image/repair'

export async function runScheduledMaintenance(
  env: AppEnv,
  dependencies: AppDependencies,
): Promise<void> {
  await runScheduledStep('record_cleanup_failed', () =>
    runRecordCleanups(env.DB, dependencies.now()),
  )
  await runScheduledStep('org_cleanup_failed', () =>
    cleanupDeletedOrgs(
      env,
      dependencies,
      productionMembersHooks(env, dependencies),
    ),
  )
  await runScheduledStep('lifecycle_alarm_repair_failed', () =>
    repairLifecycleAlarms(
      workspaceRuntime(env, dependencies),
      imageRuntime(env, dependencies),
      () => latestSoftwareRelease(env, dependencies.fetch),
    ),
  )
  await runScheduledStep('software_image_repair_failed', () =>
    repairSoftwareImages({ env, dependencies }),
  )
  // Last, so that a slow or failed email never holds back the repairs.
  await runScheduledStep('approval_email_retry_failed', () =>
    retryApprovalEmails(env, dependencies),
  )
}
