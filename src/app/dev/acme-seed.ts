import type { Workspace } from '../../shared/generated/Workspace'
import type { OrgSummary } from '../../shared/orgs'
import type { RoutineRun } from '../../shared/routines'
import { fakeGitHubSummary } from '../../test-support/fake-api'
import {
  FAKE_IDS,
  FAKE_TIME,
  type coreFixtures,
} from '../../test-support/fixtures/core'
import { listRuns } from '../../test-support/fixtures/routine-runs'
import { routineFixtures } from '../../test-support/fixtures/routines'
import { withSubWorkspaces } from '../../test-support/fixtures/sub-workspaces'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import type { DevOptions } from './options'
import type { OrgState, StartRecord } from './state'

type CoreFixtures = ReturnType<typeof coreFixtures>

/** A deleted org stays for 7 days. */
export const DELETE_AFTER = 604_800_000

/** The run that `run=` makes the run of `checkout-autocomplete`. */
const runOfWorkspace = {
  'pull-request': 'run-review-prs-opened-482',
  schedule: 'run-error-triage-hourly-3',
} as const

/**
 * The runs of the routines. Review pull requests can list the failed or
 * the skipped runs of the mockups in place of its newest runs. After the
 * suspension of Acme, it lists its runs as the suspension left them. One
 * run can have `checkout-autocomplete` as its workspace, which has a chat.
 */
function seedRuns(
  fixtures: ReturnType<typeof routineFixtures>,
  options: DevOptions,
): RoutineRun[] {
  const list = options.reviewRuns ?? (options.suspended ? 'suspended' : null)
  const review = fixtures.routines.find((item) => item.id === 'review-prs')
  const runs =
    list === null || !review
      ? fixtures.runs
      : [
          ...listRuns(review, list),
          ...fixtures.runs.filter((run) => run.routineId !== review.id),
        ]
  const linked = options.runWorkspace && runOfWorkspace[options.runWorkspace]
  return runs.map((run) =>
    run.id === linked ? { ...run, workspaceId: FAKE_IDS.workspace } : run,
  )
}

/**
 * Acme with the recorded sections, workspaces, settings, build, members,
 * and routines with their runs. A starting workspace has the recorded
 * resume step, and a workspace in the error state has the recorded start
 * error. `checkout-autocomplete` has the GitHub state of its recorded bar,
 * as the fake API gives it. With `subWorkspaces`, its list also has the
 * sub-workspaces of the mockups, in two trees in Checkout.
 */
export function acme(
  summary: OrgSummary,
  core: CoreFixtures,
  options: DevOptions,
): OrgState {
  const recorded = workspaceFixtures(
    options.server.workspaceState,
    fakeGitHubSummary(options.server),
  ).workspaces.workspaces
  const workspaces = options.server.subWorkspaces
    ? withSubWorkspaces(recorded)
    : recorded
  const active = workspaces.find(
    (workspace) => workspace.id === 'email-dark-mode',
  )
  if (active) active.state = 'working'
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
    routines: fixtures.routines,
    runs: seedRuns(fixtures, options),
  }
}
