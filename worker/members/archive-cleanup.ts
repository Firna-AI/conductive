import type { AppDependencies, AppEnv } from '../env'
import { providerForAccount } from '../sandbox/client'
import { errorSummary, WarningId } from '../warning-values'
import { warnWorker } from '../warnings'
import {
  ignoreAlreadyRemoved,
  requireDeletedOrgCleanup,
} from './cleanup-provider'
import { cleanupBusy, keepCleanupLease } from './cleanup-lease'
import { expiredOrgArchives, clearExpiredOrgDisk } from './archive-cleanup-data'

export async function cleanupOrgArchives(
  env: AppEnv,
  orgId: string,
  token: string,
  dependencies: AppDependencies,
) {
  const failures: unknown[] = []
  for (const row of await expiredOrgArchives(
    env.DB,
    orgId,
    dependencies.now(),
  )) {
    await keepCleanupLease(env, orgId, token, dependencies)
    await requireDeletedOrgCleanup(env, orgId, token)
    try {
      const provider = providerForAccount(
        env,
        dependencies.fetch,
        row.providerAccount,
      )
      await ignoreAlreadyRemoved(() => provider.delete(row.sandboxId))
      await keepCleanupLease(env, orgId, token, dependencies)
      if (
        !(await clearExpiredOrgDisk(
          env.DB,
          orgId,
          token,
          row,
          dependencies.now(),
        ))
      )
        throw cleanupBusy()
    } catch (error) {
      warnWorker({
        kind: 'workspace_archive_failed',
        workspaceId: WarningId.checked(row.workspaceId),
        phase: 'purge',
        error: errorSummary(error),
      })
      failures.push(error)
    }
  }
  if (failures.length > 0) throw failures[0]
}
