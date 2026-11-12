import type {
  OperatorOrgDetail,
  OperatorWorkspaceStates,
} from '../../shared/operator'
import type { Workspace } from '../../shared/workspaces'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import {
  sampleOrgDetail,
  type OperatorRecords,
} from '../../test-support/fixtures/operator'
import { sampleOrgs } from '../../test-support/fixtures/operator-samples'
import type { DevBackend } from './backend'
import type { OrgState } from './state'

/** The samples count their days back from the first time of the dev clock. */
const BASE = FAKE_TIME

/**
 * The workspaces of an org in the states of the operator section. Running
 * holds the states of a cloud computer that runs, and Failed the error.
 */
function statesOf(workspaces: readonly Workspace[]): OperatorWorkspaceStates {
  const states = { running: 0, stopped: 0, failed: 0, archived: 0 }
  for (const workspace of workspaces) {
    if (workspace.state === 'stopped') states.stopped += 1
    else if (workspace.state === 'error') states.failed += 1
    else if (workspace.state === 'archived') states.archived += 1
    else states.running += 1
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
): OperatorOrgDetail {
  const { org } = item
  const workspaceStates = statesOf(item.workspaces)
  const deletion = org.deletion
    ? { deletedAt: org.deletion.deletedAt, purgeAt: org.deletion.deletesAt }
    : null
  return {
    id: org.id,
    providerAccount: made.providerAccount,
    name: org.name,
    initials: org.initials ?? null,
    createdAt: made.createdAt,
    repositories: item.repositories.filter((repository) => repository.selected)
      .length,
    workspaceStates,
    running: {
      workspaces: workspaceStates.running,
      builds: item.builds.filter((entry) => entry.build.state === 'running')
        .length,
    },
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
}

/**
 * The orgs of the operator section of the dev fake, newest first: the orgs
 * that Create org made in the page, with their accounts, and then the
 * samples of the mockups, which are on `boat`, as the orgs from before the
 * second provider are.
 */
export function operatorOrgDetails(
  backend: DevBackend,
): readonly OperatorOrgDetail[] {
  const { state } = backend
  const records = state.operator
  const made = state.orgs.flatMap((item) => {
    const record = state.providers.made.get(item.org.id)
    return record ? [madeOrgDetail(item, record, records)] : []
  })
  const samples = sampleOrgs.map((org) => sampleOrgDetail(org, records, BASE))
  return [...made.reverse(), ...samples]
}
