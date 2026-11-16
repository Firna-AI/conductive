import type { AccountStats } from '../../shared/account'
import { count, nested, record } from './parse'
import { readDays, readWeekly, readWorkspaceStates } from './read-operator'

/** The counts of the Stats tab of the account, which the Worker reads in one batch. */
export function readAccountStats(value: unknown): AccountStats {
  const stats = record(value, 'account stats')
  return {
    readAt: count(stats, 'readAt'),
    orgs: count(stats, 'orgs'),
    workspaces: nested(stats, 'workspaces', (item) =>
      readWeekly(item, 'workspaces'),
    ),
    workspaceStates: nested(stats, 'workspaceStates', readWorkspaceStates),
    routines: count(stats, 'routines'),
    newWorkspacesByDay: readDays(stats, 'newWorkspacesByDay'),
    routineRunsByDay: readDays(stats, 'routineRunsByDay'),
  }
}
