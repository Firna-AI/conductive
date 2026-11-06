import type { AppDependencies, AppEnv } from '../env'
import { cleanupBusy } from './cleanup-lease'
import { runLifecycleHook } from './lifecycle-runner'
import type { OrgMaintenanceHooks } from './maintenance-contract'
import { deletedOrgDates, workspaceDisks } from './maintenance-data'
import { deletedOrgRetention } from './retention'

export async function maintainDeletedOrg(
  env: AppEnv,
  orgId: string,
  token: string,
  dependencies: AppDependencies,
  hooks: Pick<OrgMaintenanceHooks, 'maintainDeletedOrg'>,
  mode: 'retention' | 'restore' = 'retention',
) {
  const dates = await deletedOrgDates(env.DB, orgId)
  if (!dates) throw cleanupBusy()
  const workspaces = await workspaceDisks(env.DB, orgId)
  await runLifecycleHook(env, orgId, token, dependencies, (ownership) =>
    hooks.maintainDeletedOrg({
      ownership,
      orgId,
      ...dates,
      now: dependencies.now(),
      mode,
      workspaces,
      retention: deletedOrgRetention(
        env,
        orgId,
        token,
        dependencies,
        ownership,
        workspaces,
        mode,
      ),
    }),
  )
  const current = await workspaceDisks(env.DB, orgId)
  if (
    current.length !== workspaces.length ||
    current.some(
      (disk) =>
        disk.nextKeepaliveAt === null ||
        (mode === 'retention' && disk.nextKeepaliveAt <= dependencies.now()),
    )
  ) {
    throw new Error(
      'The lifecycle left a disk without its next retention deadline',
    )
  }
}
