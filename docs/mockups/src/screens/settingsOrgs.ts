import type { BuildState, OrgBuilds } from '../components/settings/BuildSection'
import type { OrgComputer } from '../components/settings/ComputerTab'
import {
  settingsLinks,
  type SettingsTab,
  suspendedSettingsLinks,
} from '../components/settings/OrgSections'
import {
  newOrgSections,
  type SidebarSection,
  suspendedSections,
  workspaceSections,
} from '../components/workspaces/sections'
import {
  changedInstallScript,
  envVars,
  failedBuild,
  firnaInstallScript,
  firstGoodBuild,
  installScript,
  installScriptWithout,
  runningBuild,
  startupScript,
  timedOutBuild,
} from '../fixtures/computer'
import {
  acmeInvites,
  acmeMembers,
  firnaMembers,
  type Invite,
  type Membership,
} from '../fixtures/members'
import { type Org, orgs } from '../fixtures/orgs'
import {
  acmeRepositories,
  changedAcmeRepositories,
  changedNames,
  newOrg,
  type ReachableRepository,
} from '../fixtures/repositories'
import {
  acmeBuildLog,
  failedFirstBuildLog,
  firstBuildLog,
  timedOutFirstBuildLog,
} from '../fixtures/terminal'
import { type Workspace, workspaceList } from '../fixtures/workspaces'
import { paths } from '../paths'
import { acmeJobs } from './acmeJobs'
import type { OrgSettingsState } from './OrgSettingsScreen'

/** The org whose settings show, and what its tabs hold. */
export type SettingsOrg = {
  org: Org
  repositories: readonly ReachableRepository[]
  members: readonly Membership[]
  invites: readonly Invite[]
  /** The workspaces of the org, with their owners. */
  workspaces: readonly Workspace[]
  computer: OrgComputer
  /** The workspace list of the org, and its sections in the sidebar. */
  list: string
  sections: readonly SidebarSection[]
  /** The New workspace page of the org. */
  newWorkspace: string
  /** The page of each tab. */
  links: Readonly<Record<SettingsTab, string>>
}

/**
 * Acme, which has built its cloud computer many times, with its newest
 * job: a build or a refresh, in the state of the tab.
 */
function acme(state: OrgSettingsState): SettingsOrg {
  return {
    org: orgs.acme,
    repositories: acmeRepositories,
    members: acmeMembers,
    invites: acmeInvites,
    workspaces: workspaceList,
    computer: {
      ...acmeJobs(state.job, state.build, state.softwareImage),
      installScript,
      changedInstallScript,
      startupScript,
      envVars,
    },
    list: paths.shell,
    sections: workspaceSections(),
    newWorkspace: paths.newWorkspace,
    links: settingsLinks,
  }
}

/**
 * The builds of Firna, the new org of the sign-up, in a state of its tab.
 * Firna has no good build until its first build succeeds. The history
 * lists the builds that ended.
 */
function firnaBuilds(
  build: BuildState,
): Pick<OrgBuilds, 'lastGood' | 'history'> {
  switch (build) {
    case 'ready':
      return { lastGood: firstGoodBuild, history: [firstGoodBuild] }
    case 'failed':
      return { history: [failedBuild] }
    case 'time-limit':
      return { history: [timedOutBuild] }
    case 'building':
    case 'none':
      return { history: [] }
  }
}

/**
 * Firna, which Cal created in Get started. Its scripts are empty and it
 * has no env vars, as for every new org, until an admin adds them.
 */
function firna(build: BuildState): SettingsOrg {
  return {
    org: orgs.firna,
    repositories: newOrg.repositories,
    members: firnaMembers,
    invites: [],
    workspaces: [],
    computer: {
      ...firnaBuilds(build),
      logs: {
        building: firstBuildLog,
        failed: failedFirstBuildLog,
        'time-limit': timedOutFirstBuildLog,
      },
      failed: { failed: failedBuild, 'time-limit': timedOutBuild },
      running: { kind: 'build', elapsed: runningBuild.elapsed },
      installScript: '',
      changedInstallScript: firnaInstallScript,
      startupScript: '',
      envVars: [],
    },
    list: paths.newOrg,
    sections: newOrgSections(),
    newWorkspace: paths.firstBuildWorkspace,
    links: { ...settingsLinks, computer: paths.firstBuildComputer },
  }
}

/**
 * Acme after a saved change of its repositories, with its newest job. A
 * build that runs clones the chosen repositories, and an admin who removes
 * a repository takes its line out of the install script that they change.
 * A refresh clones the repositories of the newest good build, so its log
 * stays.
 */
function acmeAfter(state: OrgSettingsState): SettingsOrg {
  const base = acme(state)
  const change = state.repositoryChange
  if (change === 'none') return base
  const repositories = changedAcmeRepositories(change)
  const chosen = repositories
    .filter((repository) => repository.used)
    .map((repository) => repository.name)
  const { removed } = changedNames(change)
  const { logs } = base.computer
  return {
    ...base,
    repositories,
    computer: {
      ...base.computer,
      logs:
        state.job === 'build'
          ? { ...logs, building: acmeBuildLog(chosen) }
          : logs,
      changedInstallScript:
        removed.length > 0
          ? installScriptWithout(removed)
          : base.computer.changedInstallScript,
    },
  }
}

/**
 * The org of the settings: Acme in use, Acme suspended, or Firna. Acme
 * shows its newest job and the saved change of its repositories of the
 * state.
 */
export function settingsOrg(state: OrgSettingsState): SettingsOrg {
  switch (state.org) {
    case 'active':
      return acmeAfter(state)
    case 'suspended':
      return {
        ...acmeAfter(state),
        list: paths.suspendedOrg,
        sections: suspendedSections(),
        links: suspendedSettingsLinks,
      }
    case 'new':
      return firna(state.build)
  }
}
