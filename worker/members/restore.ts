import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
import { keepCleanupLease, withCleanupLease } from './cleanup-lease'
import { stopDeletedOrg } from './deletion'
import { orgWorkspaceIds } from './deletion-data'
import { runLifecycleHook } from './lifecycle-runner'
import { maintainDeletedOrg } from './maintenance'
import { deletedOrgDates, workspaceDisks } from './maintenance-data'
import { requireOrgAdmin } from './permissions'
import {
  cancelRestoreRequest,
  pendingRestoreRequest,
  restoreOrgRecords,
  saveRestoreRequest,
} from './restore-data'
import type { MembersHooks } from './route'

export async function restoreOrg(
  env: AppEnv,
  orgId: string,
  actorId: string,
  dependencies: AppDependencies,
  hooks: MembersHooks,
) {
  const org = await requireOrgAdmin(env.DB, orgId, actorId, true)
  if (!org.deletion) return org
  if (dependencies.now() >= org.deletion.deletesAt) throw restoreExpired()
  await withCleanupLease(env, orgId, dependencies, async (token, suspended) => {
    if (
      !(await saveRestoreRequest(
        env.DB,
        orgId,
        actorId,
        token,
        dependencies.randomToken(),
        dependencies.now(),
      ))
    )
      throw restoreExpired()
    await stopDeletedOrg(env, orgId, token, suspended, dependencies, hooks)
    if (!(await finishPendingRestore(env, orgId, token, dependencies, hooks)))
      throw restoreExpired()
  })
  return requireOrgAdmin(env.DB, orgId, actorId)
}

export async function finishPendingRestore(
  env: AppEnv,
  orgId: string,
  token: string,
  dependencies: AppDependencies,
  hooks: Omit<MembersHooks, 'readWorkspace'>,
) {
  const request = await pendingRestoreRequest(
    env.DB,
    orgId,
    token,
    dependencies.now(),
  )
  if (!request) {
    await cancelRestoreRequest(env.DB, orgId, token)
    return false
  }
  await maintainDeletedOrg(env, orgId, token, dependencies, hooks, 'restore')
  const dates = await deletedOrgDates(env.DB, orgId)
  if (!dates) throw restoreExpired()
  const workspaces = await workspaceDisks(env.DB, orgId)
  const workspaceIds = await orgWorkspaceIds(env.DB, orgId)
  const installed = await runLifecycleHook(
    env,
    orgId,
    token,
    dependencies,
    (ownership) =>
      hooks.restoreOrgMaintenance({
        ownership,
        orgId,
        ...request,
        ...dates,
        now: dependencies.now(),
        workspaceIds,
        workspaces,
      }),
  )
  await keepCleanupLease(env, orgId, token, dependencies)
  if (
    !(await restoreOrgRecords(
      env.DB,
      orgId,
      request.requestedByUserId,
      token,
      request.requestId,
      installed.generation,
      dependencies.now(),
    ))
  )
    throw restoreExpired()
  return true
}

function restoreExpired() {
  return new HttpError(
    409,
    'org_restore_expired',
    'The time to restore this org has ended.',
  )
}
