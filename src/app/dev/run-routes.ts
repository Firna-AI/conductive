import {
  routinePaths,
  type Routine,
  type RoutineRun,
  type RoutineRunResponse,
  type RoutineRunsResponse,
} from '../../shared/routines'
import {
  workspaceViewPath,
  type WorkspaceViewResponse,
} from '../../shared/workspace-view'
import { runsPage } from '../../test-support/fixtures/routine-runs'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { record } from '../api/parse'
import { requireOrg, type DevBackend } from './backend'
import { startWorkspace } from './create-routes'
import {
  ownerRequired,
  projectedRun,
  requireRoutine,
  routineRuns,
} from './routine-records'
import { ID, json, requiredText, RouteError, type Route } from './router'
import type { OrgState } from './state'

/** The names of the agents, as the refusal of a missing login writes them. */
const agentNames = { claude: 'Claude', codex: 'Codex' } as const

/**
 * One page of the runs of a routine, newest first: the newest 50 after
 * the run of `before`. A cursor that names no run of the routine is
 * refused, as the Worker refuses it.
 */
function runsReply(org: OrgState, routineId: string, before: string | null) {
  requireRoutine(org, routineId)
  const runs = routineRuns(org, routineId)
  if (before !== null && !runs.some((run) => run.id === before)) {
    throw new RouteError(
      400,
      'invalid_input',
      'Read the runs again to show older runs.',
    )
  }
  return json(runsPage(runs, before) satisfies RoutineRunsResponse)
}

/** The first message of a run: the prompt, a line, and the facts of the trigger. */
function runText(routine: Routine): string {
  return `${routine.prompt}\n\n---\nRoutine: ${routine.name}\nTrigger: Run now`
}

/**
 * Starts the workspace of a run in the section of its routine, or fails
 * the run with its cause, as the Worker does. Without the agent login of
 * the routine's model, the run fails with no workspace. A prompt that
 * contains `fail` stands for a cloud computer that did not start.
 */
function startRun(
  backend: DevBackend,
  org: OrgState,
  routine: Routine,
  run: RoutineRun,
): RoutineRun {
  const { agent } = routine.choice
  const login = backend.state.account.agentLogins.find(
    (item) => item.agent === agent,
  )
  if (!login?.connected) {
    const message = `Connect ${agentNames[agent]} to run this routine.`
    const error = { code: 'agent_login_required', message }
    return { ...run, state: 'failed', error }
  }
  try {
    const created = startWorkspace(backend, org, {
      repositoryId: routine.repositoryId,
      sectionId: routine.sectionId,
      first: {
        id: backend.newId(),
        text: runText(routine),
        attachmentIds: [],
        choice: routine.choice,
      },
    })
    return { ...run, workspaceId: created.workspace.id }
  } catch (error) {
    if (!(error instanceof RouteError)) throw error
    const message = 'The cloud computer could not start. Try again.'
    const failure = { code: 'workspace_start_failed', message }
    return { ...run, state: 'failed', error: failure }
  }
}

/**
 * Run now of the owner. A routine whose every trigger is a pull request
 * event has nothing to run on, so it is refused. A repeat of the same
 * request ID answers with the same run.
 */
function runNow(
  backend: DevBackend,
  org: OrgState,
  routineId: string,
  body: unknown,
): Response {
  const routine = requireRoutine(org, routineId)
  const requestId = requiredText(record(body), 'requestId')
  if (routine.owner.id !== backend.state.account.user.id) throw ownerRequired()
  const { triggers } = routine
  if (
    triggers.length > 0 &&
    triggers.every((trigger) => trigger.kind === 'pull-request')
  ) {
    throw new RouteError(
      409,
      'routine_pull_request_required',
      'This routine runs from a pull request event.',
    )
  }
  const id = `run-${routineId}-${requestId}`
  const known = org.runs.find((run) => run.id === id)
  const at = backend.now()
  const run =
    known ??
    startRun(backend, org, routine, {
      id,
      routineId,
      orgId: org.org.id,
      trigger: { kind: 'run-now' },
      state: 'queued',
      workspaceId: null,
      error: null,
      createdAt: at,
      updatedAt: at,
    })
  if (!known) org.runs = [run, ...org.runs]
  const reply: RoutineRunResponse = { run: projectedRun(org, run) }
  return json(reply, 201)
}

/**
 * The saved view of a run workspace, with its routine and the pull request
 * of a pull request run, as the Worker joins them. Another workspace gets
 * the recorded reply.
 */
function viewReply(org: OrgState, workspaceId: string): Response | null {
  const run = org.runs.find((item) => item.workspaceId === workspaceId)
  const routine = org.routines.find((item) => item.id === run?.routineId)
  if (!run || !routine) return null
  const { trigger } = run
  const reply: WorkspaceViewResponse = {
    ...workspaceFixtures().view,
    routine: {
      id: routine.id,
      name: routine.name,
      pullRequest:
        trigger.kind === 'pull-request'
          ? { number: trigger.number, url: trigger.url }
          : null,
    },
  }
  return json(reply)
}

/** The runs of a routine, Run now, and the view of a run workspace. */
export function runRoutes(backend: DevBackend): Route[] {
  const orgOf = (org: string) => requireOrg(backend.state, org)
  return [
    {
      method: 'GET',
      path: routinePaths.runs(ID.org, ID.routine),
      answer: ({ params, query }) =>
        runsReply(orgOf(params.org), params.routine, query.get('before')),
    },
    {
      method: 'POST',
      path: routinePaths.runNow(ID.org, ID.routine),
      answer: ({ params, body }) =>
        runNow(backend, orgOf(params.org), params.routine, body),
    },
    {
      method: 'GET',
      path: workspaceViewPath(ID.org, ID.workspace),
      answer: ({ params }) => viewReply(orgOf(params.org), params.workspace),
    },
  ]
}
