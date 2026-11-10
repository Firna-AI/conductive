import type { AgentLoginStatus } from '../../shared/account'
import type { OrgSummary } from '../../shared/orgs'
import type { RoutineRun } from '../../shared/routines'
import type { Workspace } from '../../shared/workspaces'
import {
  coreFixtures,
  FAKE_IDS,
  FAKE_TIME,
} from '../../test-support/fixtures/core'
import { listRuns } from '../../test-support/fixtures/routine-runs'
import { routineFixtures } from '../../test-support/fixtures/routines'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { AGENTS } from '../api/read-core'
import { getStartedOrder } from '../get-started'
import type { DevOptions } from './options'
import {
  freshOrg,
  type DevState,
  type OrgState,
  type StartRecord,
} from './state'

type CoreFixtures = ReturnType<typeof coreFixtures>

/** A deleted org stays for 7 days. */
const DELETE_AFTER = 604_800_000

/**
 * The runs of the routines. Review pull requests can list the failed or
 * the skipped runs of the mockups in place of its newest runs. After the
 * suspension of Acme, it lists its runs as the suspension left them.
 */
function seedRuns(
  fixtures: ReturnType<typeof routineFixtures>,
  options: DevOptions,
): RoutineRun[] {
  const list = options.reviewRuns ?? (options.suspended ? 'suspended' : null)
  const review = fixtures.routines.find((item) => item.id === 'review-prs')
  if (list === null || !review) return fixtures.runs
  const others = fixtures.runs.filter((run) => run.routineId !== review.id)
  return [...listRuns(review, list), ...others]
}

/**
 * Acme with the recorded sections, workspaces, settings, build, members,
 * and routines with their runs. A starting workspace has the recorded
 * resume step, and a workspace in the error state has the recorded start
 * error.
 */
function acme(
  summary: OrgSummary,
  core: CoreFixtures,
  options: DevOptions,
): OrgState {
  const { workspaces } = workspaceFixtures(options.server.workspaceState)
  const fixtures = routineFixtures(summary.id)
  const starting = workspaceFixtures('starting').detail.start
  const failed = workspaceFixtures('error').detail.error
  const startOf = (workspace: Workspace): [string, StartRecord] => [
    workspace.id,
    {
      start: workspace.state === 'starting' ? starting : null,
      error: workspace.state === 'error' ? failed : null,
    },
  ]
  const deletion = {
    deletedAt: FAKE_TIME,
    deletesAt: FAKE_TIME + DELETE_AFTER,
  }
  return {
    org: {
      ...summary,
      ...(options.deleted ? { deletion } : {}),
      ...(options.suspended ? { suspension: { suspendedAt: FAKE_TIME } } : {}),
    },
    sections: core.sectionList.sections,
    workspaces: workspaces.workspaces,
    starts: new Map(workspaces.workspaces.map(startOf)),
    created: new Set(),
    running: new Map(),
    repositories: core.repositories.repositories,
    settings: core.settings.settings,
    builds: [core.build],
    currentImageBuildId: core.builds.currentImageBuildId,
    members: core.members,
    routines: fixtures.routines,
    runs: seedRuns(fixtures, options),
  }
}

/**
 * The state when the app opens. Get started is done before `firstRun`, and
 * not done from it on. The other recorded orgs start as new orgs, because
 * the recorded server has no replies for them.
 */
export function seedState(options: DevOptions): DevState {
  const core = coreFixtures(options.server.role)
  const { user } = core.account
  const { firstRun } = options
  const noOrg = firstRun === 'github-app' || firstRun === 'org'
  const noLogin = options.noAgentLogin || firstRun !== null
  const done =
    firstRun === null
      ? getStartedOrder.length
      : getStartedOrder.indexOf(firstRun)
  const orgs = core.orgs.orgs.map((org) =>
    org.id === FAKE_IDS.org
      ? acme(org, core, options)
      : freshOrg(org, user, FAKE_TIME),
  )
  return {
    account: {
      ...core.account,
      agentLogins: noLogin
        ? AGENTS.map((agent): AgentLoginStatus => ({ agent, connected: false }))
        : core.account.agentLogins,
    },
    getStarted: {
      orgId: noOrg ? null : FAKE_IDS.org,
      steps: getStartedOrder.map((step, index) => ({
        step,
        complete: index < done,
      })),
    },
    orgs: noOrg ? [] : orgs,
    githubAppInstalled: firstRun !== 'github-app',
    attachments: new Map(),
    stopAfterMs: options.stopAfterMs,
    shareSaveFails: options.shareSaveFails,
  }
}
