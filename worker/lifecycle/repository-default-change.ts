import { scheduleWorkspaceAlarm } from '../features/alarms'
import type { GitHubRefresh, GitHubWorkspace } from '../github/contracts'
import { activeWorkspace } from '../github/data'
import type { ReceiverStorage } from '../members/receiver-storage'
import { requireWorkspaceOrg } from './access'
import { BASE_CHANGE_JOB_KEY, type BaseChangeJob } from './base-change-job'
import { readWorkspace } from './workspace-data'

/** Persist the move before the webhook can replace the saved default. */
export async function saveRepositoryDefaultChange(
  db: D1Database,
  storage: ReceiverStorage,
  workspace: GitHubWorkspace,
  target: NonNullable<GitHubRefresh['repositoryDefault']>,
  now: number,
): Promise<void> {
  await requireWorkspaceOrg(db, workspace.orgId, workspace.id)
  const current = await activeWorkspace(db, workspace.id, workspace.orgId)
  const row = await readWorkspace(db, workspace.orgId, workspace.id)
  if (
    !current ||
    current.repositoryId !== workspace.repositoryId ||
    current.branch !== workspace.branch ||
    current.baseBranch != null ||
    row.archivedAt !== null ||
    row.state === 'archived'
  )
    return
  await storage.transaction(async (transaction) => {
    const pending = await transaction.get<BaseChangeJob | null>(
      BASE_CHANGE_JOB_KEY,
    )
    const previous =
      pending?.binding.repositoryId === current.repositoryId &&
      pending.binding.branch === current.branch
        ? pending
        : undefined
    if (
      previous?.binding.installationId === target.installationId &&
      previous.binding.fullName === target.fullName &&
      previous.change.to === target.defaultBranch &&
      (!target.deliveryId ||
        previous.repositoryDeliveries?.includes(target.deliveryId))
    )
      return
    const job: BaseChangeJob = {
      id: previous?.id ?? `baseChange-${crypto.randomUUID()}`,
      revision: crypto.randomUUID(),
      binding: {
        ...current,
        fullName: target.fullName,
        defaultBranch: target.defaultBranch,
        installationId: target.installationId,
      },
      change: {
        from: previous?.change.from ?? current.defaultBranch,
        to: target.defaultBranch,
      },
      repositoryBeforeSave: previous?.repositoryBeforeSave ?? {
        fullName: current.fullName,
        defaultBranch: current.defaultBranch,
        installationId: current.installationId,
      },
      repositoryDeliveries: [
        ...new Set([
          ...(previous?.repositoryDeliveries ?? []),
          ...(target.deliveryId ? [target.deliveryId] : []),
        ]),
      ],
      at: Math.min(now, previous?.at ?? now),
      failures: previous?.failures ?? 0,
    }
    await transaction.put(BASE_CHANGE_JOB_KEY, job)
    await transaction.put('alarm:baseChange', now)
    await scheduleWorkspaceAlarm(transaction)
  })
}
