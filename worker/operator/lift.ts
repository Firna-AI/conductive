import type {
  OrgSuspensionLiftResponse,
  UserSuspensionLiftResponse,
} from '../../src/shared/operator'
import { workspaceOwnerChangedHook } from '../lifecycle/ownership-maintenance'
import { wakeProviderSwitch } from '../lifecycle/provider-switch-control'
import { imageRuntime } from '../lifecycle/runtime'
import type { WorkspaceRuntime } from '../lifecycle/workspace-runtime'
import { ownedWorkspaces } from './data'
import { recordSuspensionChange, type SuspensionTarget } from './events-data'
import { orgWorkspaces } from './org-data'

async function liftSuspension(
  runtime: WorkspaceRuntime,
  target: SuspensionTarget,
  operatorId: string,
) {
  const { env, dependencies } = runtime
  const now = dependencies.now()
  const recorded = await recordSuspensionChange(
    env.DB,
    target,
    'lift',
    operatorId,
    now,
  )
  const pendingWorkspaceIds: string[] = []
  if (recorded.changed) {
    if (target.kind === 'user')
      await wakeUserProviderSwitches(runtime, recorded.id)
    else await wakeProviderSwitch(imageRuntime(env, dependencies), recorded.id)
    const workspaces =
      target.kind === 'user'
        ? await ownedWorkspaces(env.DB, recorded.id)
        : await orgWorkspaces(env.DB, recorded.id)
    const check = workspaceOwnerChangedHook(runtime)
    for (const workspace of workspaces) {
      try {
        await check(workspace.id)
      } catch {
        pendingWorkspaceIds.push(workspace.id)
      }
    }
  }
  return {
    id: recorded.id,
    liftedAt: recorded.changed ? now : null,
    pendingWorkspaceIds,
  }
}

export async function wakeUserProviderSwitches(
  runtime: WorkspaceRuntime,
  userId: string,
): Promise<void> {
  const images = imageRuntime(runtime.env, runtime.dependencies)
  for (const orgId of await userProviderSwitchOrgs(runtime.env.DB, userId))
    await wakeProviderSwitch(images, orgId)
}

async function userProviderSwitchOrgs(
  db: D1Database,
  userId: string,
): Promise<string[]> {
  const { results } = await db
    .prepare(
      `SELECT s.org_id AS orgId FROM org_provider_switches s
       JOIN org_members m ON m.org_id = s.org_id
       WHERE m.user_id = ? AND s.state IN ('waiting', 'building') ORDER BY s.org_id`,
    )
    .bind(userId)
    .all<{ orgId: string }>()
  return results.map((row) => row.orgId)
}

export async function liftUserSuspension(
  runtime: WorkspaceRuntime,
  githubId: number,
  operatorId: string,
): Promise<UserSuspensionLiftResponse> {
  const { id: userId, ...result } = await liftSuspension(
    runtime,
    { kind: 'user', githubId },
    operatorId,
  )
  return { userId, ...result }
}

export async function liftOrgSuspension(
  runtime: WorkspaceRuntime,
  orgId: string,
  operatorId: string,
): Promise<OrgSuspensionLiftResponse> {
  const { id, ...result } = await liftSuspension(
    runtime,
    { kind: 'org', orgId },
    operatorId,
  )
  return { orgId: id, ...result }
}
