import type { Routine, RoutineRun } from '../../shared/routines'
import { RouteError } from './router'
import type { OrgState } from './state'

export function requireRoutine(org: OrgState, routineId: string): Routine {
  const routine = org.routines.find((item) => item.id === routineId)
  if (!routine) {
    throw new RouteError(
      404,
      'routine_not_found',
      'The routine is not available.',
    )
  }
  return routine
}

export function ownerRequired(): RouteError {
  return new RouteError(
    403,
    'routine_owner_required',
    'Only the owner can change this routine.',
  )
}

/**
 * A run as the Worker gives it. A run with a workspace of the fake has the
 * state of that workspace, and the start error of a workspace that failed.
 * The fake has no workspaces for the runs that the fixtures list, so they
 * keep their own state.
 */
export function projectedRun(org: OrgState, run: RoutineRun): RoutineRun {
  if (run.state === 'failed' || run.state === 'skipped') return run
  const workspace = org.workspaces.find((item) => item.id === run.workspaceId)
  if (!workspace) return run
  const failure = org.starts.get(workspace.id)?.error
  return {
    ...run,
    state: workspace.state,
    error:
      workspace.state === 'error' && failure
        ? { code: failure.code, message: failure.message }
        : null,
    updatedAt: Math.max(run.updatedAt, workspace.updatedAt),
  }
}

/** The runs of a routine, newest first, as the Worker orders them. */
export function routineRuns(org: OrgState, routineId: string): RoutineRun[] {
  return org.runs
    .filter((run) => run.routineId === routineId)
    .map((run) => projectedRun(org, run))
    .sort((a, b) => b.createdAt - a.createdAt || (a.id < b.id ? 1 : -1))
}
