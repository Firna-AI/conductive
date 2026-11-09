import type { AgentLoginStatus } from '../../shared/account'
import type { OrgSummary } from '../../shared/orgs'
import type { Workspace } from '../../shared/workspaces'
import {
  coreFixtures,
  FAKE_IDS,
  FAKE_TIME,
} from '../../test-support/fixtures/core'
import {
  sampleOperator,
  sampleRecords,
  type OperatorRecords,
} from '../../test-support/fixtures/operator'
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
 * Acme with the recorded sections, workspaces, settings, build, and
 * members. A starting workspace has the recorded resume step, and a
 * workspace in the error state has the recorded start error.
 */
function acme(
  summary: OrgSummary,
  core: CoreFixtures,
  options: DevOptions,
): OrgState {
  const { workspaces } = workspaceFixtures(options.server.workspaceState)
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
  }
}

/**
 * The records of the operator samples. Acme of the options is deleted or
 * suspended there too, so the operator sees it as its members do.
 */
function operatorRecords(options: DevOptions): OperatorRecords {
  const records = sampleRecords(FAKE_TIME)
  if (options.deleted) {
    records.orgDeletions.set(FAKE_IDS.org, {
      deletedAt: FAKE_TIME,
      purgeAt: FAKE_TIME + DELETE_AFTER,
    })
  }
  if (options.suspended) {
    records.orgSuspensions.set(FAKE_IDS.org, {
      suspendedAt: FAKE_TIME,
      operator: sampleOperator,
    })
  }
  return records
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
      operator: options.operator,
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
    operator: operatorRecords(options),
  }
}
