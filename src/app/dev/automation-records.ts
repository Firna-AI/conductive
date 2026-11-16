import type { Automation, AutomationRun } from '../../shared/automations'
import { RouteError } from './router'
import type { OrgState } from './state'

export function requireAutomation(
  org: OrgState,
  automationId: string,
): Automation {
  const automation = org.automations.find((item) => item.id === automationId)
  if (!automation) {
    throw new RouteError(
      404,
      'automation_not_found',
      'The automation is not available.',
    )
  }
  return automation
}

export function ownerRequired(): RouteError {
  return new RouteError(
    403,
    'automation_owner_required',
    'Only the owner can change this automation.',
  )
}

/**
 * A run as the Worker gives it. A run with a workspace of the fake has the
 * state of that workspace, and the start error of a workspace that failed.
 * The fake has no workspaces for the runs that the fixtures list, so they
 * keep their own state.
 */
export function projectedRun(org: OrgState, run: AutomationRun): AutomationRun {
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

/** The runs of an automation, newest first, as the Worker orders them. */
export function automationRuns(
  org: OrgState,
  automationId: string,
): AutomationRun[] {
  return org.runs
    .filter((run) => run.automationId === automationId)
    .map((run) => projectedRun(org, run))
    .sort((a, b) => b.createdAt - a.createdAt || (a.id < b.id ? 1 : -1))
}
