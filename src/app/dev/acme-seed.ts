import type { ArchivedComputerState } from '../../shared/generated/ArchivedComputerState'
import type { Workspace } from '../../shared/generated/Workspace'
import type { OrgSummary } from '../../shared/orgs'
import type { AutomationRun } from '../../shared/automations'
import { WORKSPACE_RESTORE_MS } from '../../shared/workspaces'
import { fakeGitHubSummary } from '../../test-support/fake-api'
import {
  FAKE_IDS,
  FAKE_TIME,
  type coreFixtures,
} from '../../test-support/fixtures/core'
import { listRuns } from '../../test-support/fixtures/automation-runs'
import { automationFixtures } from '../../test-support/fixtures/automations'
import { withSubWorkspaces } from '../../test-support/fixtures/sub-workspaces'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import type { DevOptions } from './options'
import type { OrgState, StartRecord } from './state'

type CoreFixtures = ReturnType<typeof coreFixtures>

/** A deleted org stays for 7 days. */
const DELETE_AFTER = 604_800_000

/** The run that `run=` makes the run of `checkout-autocomplete`. */
const runOfWorkspace = {
  'pull-request': 'run-review-prs-opened-482',
  schedule: 'run-error-triage-hourly-3',
} as const

/**
 * The runs of the automations. Review pull requests can list the failed or
 * the skipped runs of the mockups in place of its newest runs. After the
 * suspension of Acme, it lists its runs as the suspension left them. One
 * run can have `checkout-autocomplete` as its workspace, which has a chat.
 */
function seedRuns(
  fixtures: ReturnType<typeof automationFixtures>,
  options: DevOptions,
): AutomationRun[] {
  const list = options.reviewRuns ?? (options.suspended ? 'suspended' : null)
  const review = fixtures.automations.find((item) => item.id === 'review-prs')
  const runs =
    list === null || !review
      ? fixtures.runs
      : [
          ...listRuns(review, list),
          ...fixtures.runs.filter((run) => run.automationId !== review.id),
        ]
  const linked = options.runWorkspace && runOfWorkspace[options.runWorkspace]
  return runs.map((run) =>
    run.id === linked ? { ...run, workspaceId: FAKE_IDS.workspace } : run,
  )
}

/**
 * The workspaces with `state` as the state of the cloud computer of each
 * archived one, with the end of its 14 days, as the Worker sends it. With
 * no state, they stay as they are, as the records of an older Worker.
 */
function withArchivedComputer(
  workspaces: readonly Workspace[],
  state: ArchivedComputerState | null,
): readonly Workspace[] {
  if (state === null) return workspaces
  return workspaces.map((workspace) =>
    workspace.state === 'archived' && workspace.archivedAt !== null
      ? {
          ...workspace,
          archivedComputer: {
            state,
            restoreUntil: workspace.archivedAt + WORKSPACE_RESTORE_MS,
          },
        }
      : workspace,
  )
}

/**
 * Acme with the recorded sections, workspaces, settings, build, members,
 * and automations with their runs. A starting workspace has the recorded
 * resume step, and a workspace in the error state has the recorded start
 * error. `checkout-autocomplete` has the GitHub state of its recorded bar,
 * as the fake API gives it. With `subWorkspaces`, its list also has the
 * sub-workspaces of the mockups, in two trees in Checkout. With
 * `archivedComputer`, each archived workspace has that state of its cloud
 * computer.
 */
export function acme(
  summary: OrgSummary,
  core: CoreFixtures,
  options: DevOptions,
): OrgState {
  const recorded = withArchivedComputer(
    workspaceFixtures(
      options.server.workspaceState,
      fakeGitHubSummary(options.server),
    ).workspaces.workspaces,
    options.archivedComputer,
  )
  const workspaces = options.server.subWorkspaces
    ? withSubWorkspaces(recorded)
    : recorded
  const active = workspaces.find(
    (workspace) => workspace.id === 'email-dark-mode',
  )
  if (active) {
    active.state = 'working'
    // Only a starting workspace has a waiting answer, as the Worker sends.
    delete active.messageWaiting
  }
  const fixtures = automationFixtures(summary.id)
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
    workspaces,
    workspaceNumberCount: Math.max(
      0,
      ...workspaces.map(({ number }) => number),
    ),
    starts: new Map(workspaces.map(startOf)),
    created: new Set(),
    running: new Map(),
    repositories: core.repositories.repositories,
    settings: core.settings.settings,
    builds: [core.build],
    settingsRevision: 1,
    buildInputs: new Map([
      [
        core.build.build.id,
        {
          installScript: core.settings.settings.installScript,
          repositories: core.repositories.repositories
            .filter((repository) => repository.selected)
            .map(({ id, fullName }) => ({ id, fullName })),
        },
      ],
    ]),
    currentImageBuildId: core.builds.currentImageBuildId,
    members: core.members,
    automations: fixtures.automations,
    runs: seedRuns(fixtures, options),
  }
}
