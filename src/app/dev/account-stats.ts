import type { AccountStats } from '../../shared/account'
import type { WorkspaceState } from '../../shared/generated/WorkspaceState'
import { workspaceRemovedAt } from '../../shared/workspaces'
import type { DevState } from './state'

const DAY = 24 * 60 * 60 * 1_000

/** The workspace states that count as Running, as the Worker counts them. */
const RUNNING: readonly WorkspaceState[] = [
  'starting',
  'ready',
  'working',
  'unread',
  'input',
]

/** The 30 UTC days through `now`, oldest first, each with its count. */
function days(times: readonly number[], now: number) {
  const today = new Date(now)
  today.setUTCHours(0, 0, 0, 0)
  const firstDay = today.getTime() - 29 * DAY
  return Array.from({ length: 30 }, (_, index) => {
    const start = firstDay + index * DAY
    return {
      date: new Date(start).toISOString().slice(0, 10),
      count: times.filter(
        (time) => time >= start && time < start + DAY && time <= now,
      ).length,
    }
  })
}

/**
 * The counts of the Stats tab from the orgs of the dev fake, by the rules
 * of the Worker: the orgs that are not deleted, the workspaces and the
 * automations that the person owns in them, and the runs that were not
 * skipped, by their owner. As the Worker does, `archived` keeps the
 * removed workspaces, which `removed` counts too.
 */
export function devAccountStats(state: DevState, now: number): AccountStats {
  const userId = state.account.user.id
  const orgs = state.orgs.filter((org) => !org.org.deletion)
  const workspaces = orgs
    .flatMap((org) => org.workspaces)
    .filter((workspace) => workspace.owner.id === userId)
  const live = workspaces.filter(
    (workspace) =>
      workspace.archivedAt === null && workspace.state !== 'archived',
  )
  const automations = orgs
    .flatMap((org) => org.automations)
    .filter((automation) => automation.owner.id === userId)
  const runs = orgs
    .flatMap((org) => org.runs)
    .filter((run) => run.owner?.id === userId && run.state !== 'skipped')
  return {
    readAt: now,
    orgs: orgs.length,
    workspaces: {
      total: workspaces.length,
      lastWeek: workspaces.filter(
        (workspace) =>
          workspace.createdAt >= now - 7 * DAY && workspace.createdAt <= now,
      ).length,
    },
    workspaceStates: {
      running: live.filter((workspace) => RUNNING.includes(workspace.state))
        .length,
      stopped: live.filter((workspace) => workspace.state === 'stopped').length,
      failed: live.filter((workspace) => workspace.state === 'error').length,
      archived: workspaces.length - live.length,
      removed: workspaces.filter(
        (workspace) => workspaceRemovedAt(workspace.archivedAt, now) !== null,
      ).length,
    },
    automations: automations.length,
    newWorkspacesByDay: days(
      workspaces.map((workspace) => workspace.createdAt),
      now,
    ),
    automationRunsByDay: days(
      runs.map((run) => run.createdAt),
      now,
    ),
  }
}
