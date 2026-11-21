import type { Workspace } from '../../shared/generated/Workspace'
import type {
  OperatorOrgDetail,
  OperatorWorkspaceStates,
} from '../../shared/operator'
import { workspaceRemovedAt } from '../../shared/workspaces'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import {
  sampleOrgDetail,
  type OperatorRecords,
} from '../../test-support/fixtures/operator'
import { sampleOrgs } from '../../test-support/fixtures/operator-samples'
import { withSampleSwitch } from '../../test-support/fixtures/operator-switch'
import type { DevBackend } from './backend'
import type { OrgState } from './state'
import { withSwitches } from './switch-routes'

/** The samples count their days back from the first time of the dev clock. */
const BASE = FAKE_TIME

/**
 * The workspaces of an org in the states of the operator section, as the
 * Worker replies with them. Running holds the states of a cloud computer
 * that runs, and Failed the error. Archived keeps the removed workspaces,
 * whose Restore ended, and Removed counts them too.
 */
function statesOf(
  workspaces: readonly Workspace[],
  now: number,
): OperatorWorkspaceStates {
  const states = { running: 0, stopped: 0, failed: 0, archived: 0, removed: 0 }
  for (const workspace of workspaces) {
    if (workspace.state === 'stopped') states.stopped += 1
    else if (workspace.state === 'error') states.failed += 1
    else if (workspace.state === 'archived') {
      states.archived += 1
      if (workspaceRemovedAt(workspace.archivedAt, now) !== null) {
        states.removed += 1
      }
    } else states.running += 1
  }
  return states
}

/**
 * The page of an org that Create org made in the page, as the Worker gives
 * it to the operator: its account and its time from the create, and its
 * repositories, workspaces, builds, members, and records from the state.
 */
function madeOrgDetail(
  item: OrgState,
  made: { providerAccount: string; createdAt: number },
  records: OperatorRecords,
  now: number,
): OperatorOrgDetail {
  const { org } = item
  const workspaceStates = statesOf(item.workspaces, now)
  const deletion = org.deletion
    ? { deletedAt: org.deletion.deletedAt, purgeAt: org.deletion.deletesAt }
    : null
  const builds = item.builds.filter(
    (entry) => entry.build.state === 'running',
  ).length
  const detail: OperatorOrgDetail = {
    id: org.id,
    providerAccount: made.providerAccount,
    name: org.name,
    initials: org.initials ?? null,
    createdAt: made.createdAt,
    repositories: item.repositories.filter((repository) => repository.selected)
      .length,
    workspaceStates,
    running: { workspaces: workspaceStates.running, builds },
    members: item.members.members.map(({ user, role }) => ({
      githubId: user.githubId,
      login: user.githubLogin,
      name: user.displayName,
      role,
      suspended: records.userSuspensions.has(user.githubId),
    })),
    suspension: records.orgSuspensions.get(org.id) ?? null,
    deletion,
  }
  return withSampleSwitch(detail, now)
}

/**
 * The orgs of the operator section of the dev fake, newest first: the orgs
 * that Create org made in the page, with their accounts, and then the
 * samples of the mockups, which are on `boat`, as the orgs from before the
 * second provider are. Each has its switches of the provider account.
 */
export function operatorOrgDetails(
  backend: DevBackend,
): readonly OperatorOrgDetail[] {
  const { state } = backend
  const records = state.operator
  const made = state.orgs.flatMap((item) => {
    const record = state.providers.made.get(item.org.id)
    return record ? [madeOrgDetail(item, record, records, backend.now())] : []
  })
  const samples = sampleOrgs.map((org) => sampleOrgDetail(org, records, BASE))
  return [...made.reverse(), ...samples].map((detail) =>
    withSwitches(detail, state.switches),
  )
}
