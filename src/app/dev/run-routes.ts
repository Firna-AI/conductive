import {
  automationPaths,
  type Automation,
  type AutomationRun,
  type AutomationRunResponse,
  type AutomationRunsResponse,
} from '../../shared/automations'
import {
  workspaceViewPath,
  type WorkspaceViewResponse,
} from '../../shared/workspace-view'
import type { CreateWorkspaceResponse } from '../../shared/workspaces'
import { runsPage } from '../../test-support/fixtures/automation-runs'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { record } from '../api/parse'
import { requireOrg, type DevBackend } from './backend'
import { createdCapabilities } from './capability-routes'
import { startWorkspace } from './create-routes'
import {
  ownerRequired,
  projectedRun,
  requireAutomation,
  automationRuns,
} from './automation-records'
import { ID, json, requiredText, RouteError, type Route } from './router'
import type { OrgState } from './state'

/** The names of the agents, as the refusal of a missing login writes them. */
const agentNames = { claude: 'Claude', codex: 'Codex' } as const

/**
 * One page of the runs of an automation, newest first: the newest 50 after
 * the run of `before`. A cursor that names no run of the automation is
 * refused, as the Worker refuses it.
 */
function runsReply(org: OrgState, automationId: string, before: string | null) {
  requireAutomation(org, automationId)
  const runs = automationRuns(org, automationId)
  if (before !== null && !runs.some((run) => run.id === before)) {
    throw new RouteError(
      400,
      'invalid_input',
      'Read the runs again to show older runs.',
    )
  }
  return json(runsPage(runs, before) satisfies AutomationRunsResponse)
}

/** The first message of a run: the prompt, a line, and the facts of the trigger. */
function runText(automation: Automation): string {
  return `${automation.prompt}\n\n---\nAutomation: ${automation.name}\nTrigger: Run now`
}

/**
 * Starts the workspace of a run in the section of its automation, or fails
 * the run with its cause, as the Worker does. Without the agent login of
 * the automation's model, the run fails with no workspace, and so does a
 * create that the fake refuses, such as without an image, with the code
 * and the words of the refusal. A prompt that contains `fail` stands for a
 * cloud computer that did not start: the run fails and keeps its
 * workspace, in the error state with Try again. The workspace starts with
 * the chosen secrets of the automation pre-approved, and Mac access off.
 */
function startRun(
  backend: DevBackend,
  org: OrgState,
  automation: Automation,
  run: AutomationRun,
): AutomationRun {
  const { agent } = automation.choice
  const login = backend.state.account.agentLogins.find(
    (item) => item.agent === agent,
  )
  if (!login?.connected) {
    const message = `Connect ${agentNames[agent]} to run this automation.`
    const error = { code: 'agent_login_required', message }
    return { ...run, state: 'failed', error }
  }
  const capabilities = createdCapabilities(backend.state, org.org.id, {
    ...automation.capabilities,
    macAccess: false,
  })
  let created: CreateWorkspaceResponse
  try {
    created = startWorkspace(backend, org, {
      repositoryId: automation.repositoryId,
      sectionId: automation.sectionId,
      first: {
        id: backend.newId(),
        text: runText(automation),
        attachmentIds: [],
        choice: automation.choice,
      },
      keepFailedStart: true,
    })
  } catch (error) {
    if (!(error instanceof RouteError)) throw error
    const refusal = { code: error.code, message: error.message }
    return { ...run, state: 'failed', error: refusal }
  }
  const workspaceId = created.workspace.id
  capabilities.keep(workspaceId)
  if (!created.error) return { ...run, workspaceId }
  const { code, message } = created.error
  return { ...run, state: 'failed', workspaceId, error: { code, message } }
}

/**
 * Run now of the owner. An automation whose every trigger is a pull request
 * event has nothing to run on, so it is refused. A repeat of the same
 * request ID answers with the same run.
 */
function runNow(
  backend: DevBackend,
  org: OrgState,
  automationId: string,
  body: unknown,
): Response {
  const automation = requireAutomation(org, automationId)
  const requestId = requiredText(record(body), 'requestId')
  if (automation.owner.id !== backend.state.account.user.id)
    throw ownerRequired()
  const { triggers } = automation
  if (
    triggers.length > 0 &&
    triggers.every((trigger) => trigger.kind === 'pull-request')
  ) {
    throw new RouteError(
      409,
      'automation_pull_request_required',
      'This automation runs from a pull request event.',
    )
  }
  const id = `run-${automationId}-${requestId}`
  const known = org.runs.find((run) => run.id === id)
  const at = backend.now()
  const run =
    known ??
    startRun(backend, org, automation, {
      id,
      automationId,
      orgId: org.org.id,
      agent: automation.choice.agent,
      owner: { ...automation.owner },
      trigger: { kind: 'run-now' },
      state: 'queued',
      workspaceId: null,
      error: null,
      createdAt: at,
      updatedAt: at,
    })
  if (!known) org.runs = [run, ...org.runs]
  const reply: AutomationRunResponse = { run: projectedRun(org, run) }
  return json(reply, 201)
}

/**
 * The saved view of a run workspace, with its automation and the pull request
 * of a pull request run, as the Worker joins them. Another workspace gets
 * the recorded reply.
 */
function viewReply(org: OrgState, workspaceId: string): Response | null {
  const run = org.runs.find((item) => item.workspaceId === workspaceId)
  const automation = org.automations.find(
    (item) => item.id === run?.automationId,
  )
  if (!run || !automation) return null
  const { trigger } = run
  const reply: WorkspaceViewResponse = {
    ...workspaceFixtures().view,
    automation: {
      id: automation.id,
      name: automation.name,
      pullRequest:
        trigger.kind === 'pull-request'
          ? { number: trigger.number, url: trigger.url }
          : null,
    },
  }
  return json(reply)
}

/** The runs of an automation, Run now, and the view of a run workspace. */
export function runRoutes(backend: DevBackend): Route[] {
  const orgOf = (org: string) => requireOrg(backend.state, org)
  return [
    {
      method: 'GET',
      path: automationPaths.runs(ID.org, ID.automation),
      answer: ({ params, query }) =>
        runsReply(orgOf(params.org), params.automation, query.get('before')),
    },
    {
      method: 'POST',
      path: automationPaths.runNow(ID.org, ID.automation),
      answer: ({ params, body }) =>
        runNow(backend, orgOf(params.org), params.automation, body),
    },
    {
      method: 'GET',
      path: workspaceViewPath(ID.org, ID.workspace),
      answer: ({ params }) => viewReply(orgOf(params.org), params.workspace),
    },
  ]
}
