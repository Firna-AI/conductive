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
  buildHistory,
  changedInstallScript,
  endedBuild,
  envVars,
  failedBuild,
  firnaInstallScript,
  firstGoodBuild,
  installScript,
  installScriptWithout,
  lastBuild,
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
import { acmeSecrets, type OrgSecret } from '../fixtures/secrets'
import {
  acmeRepositories,
  changedAcmeRepositories,
  changedNames,
  newOrg,
  type ReachableRepository,
  type RepositoryChange,
} from '../fixtures/repositories'
import {
  acmeBuildLog,
  buildLog,
  endedBuildLog,
  endedFirstBuildLog,
  failedBuildLog,
  failedFirstBuildLog,
  firstBuildLog,
  timedOutBuildLog,
  timedOutFirstBuildLog,
  waitingBuildLog,
} from '../fixtures/terminal'
import { type Workspace, workspaceList } from '../fixtures/workspaces'
import { paths } from '../paths'
import type { OrgSettingsState } from './orgSettingsState'
import { acmeSkillsComputer } from './settingsSkills'

/** The org whose settings show, and what its tabs hold. */
export type SettingsOrg = {
  org: Org
  repositories: readonly ReachableRepository[]
  members: readonly Membership[]
  invites: readonly Invite[]
  /** The workspaces of the org, with their owners. */
  workspaces: readonly Workspace[]
  computer: OrgComputer
  /** The secrets of the org, which agents use after approval. */
  secrets: readonly OrgSecret[]
  /** The workspace list of the org, and its sections in the sidebar. */
  list: string
  sections: readonly SidebarSection[]
  /** The New workspace page of the org. */
  newWorkspace: string
  /** The page of each tab. */
  links: Readonly<Record<SettingsTab, string>>
}

/** Acme, which has built its cloud computer many times. */
const acme: SettingsOrg = {
  org: orgs.acme,
  repositories: acmeRepositories,
  members: acmeMembers,
  invites: acmeInvites,
  workspaces: workspaceList,
  computer: {
    lastGood: lastBuild,
    history: buildHistory,
    logs: {
      building: buildLog,
      waiting: waitingBuildLog,
      failed: failedBuildLog,
      'time-limit': timedOutBuildLog,
      ended: endedBuildLog,
    },
    installScript,
    changedInstallScript,
    startupScript,
    envVars,
  },
  secrets: acmeSecrets,
  list: paths.shell,
  sections: workspaceSections(),
  newWorkspace: paths.newWorkspace,
  links: settingsLinks,
}

/**
 * The builds of Firna, the new org of the sign-up, in a state of its tab.
 * Firna has no good build until its first build succeeds. The history
 * lists the builds that ended.
 */
function firnaBuilds(build: BuildState): Omit<OrgBuilds, 'logs'> {
  switch (build) {
    case 'ready':
      return { lastGood: firstGoodBuild, history: [firstGoodBuild] }
    case 'failed':
      return { history: [failedBuild] }
    case 'time-limit':
      return { history: [timedOutBuild] }
    case 'ended':
      return { history: [endedBuild] }
    case 'building':
    case 'waiting':
    case 'none':
      return { history: [] }
  }
}

/**
 * Firna, which Cal created in Get started. Its scripts are empty, and it
 * has no env vars, no skills repository, and no secrets.
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
        waiting: waitingBuildLog,
        failed: failedFirstBuildLog,
        'time-limit': timedOutFirstBuildLog,
        ended: endedFirstBuildLog,
      },
      installScript: '',
      changedInstallScript: firnaInstallScript,
      startupScript: '',
      envVars: [],
    },
    secrets: [],
    list: paths.newOrg,
    sections: newOrgSections(),
    newWorkspace: paths.firstBuildWorkspace,
    links: {
      ...settingsLinks,
      computer: paths.firstBuildComputer,
      secrets: paths.secretsEmpty,
    },
  }
}

/**
 * Acme after a saved change of its repositories. A build that runs clones
 * the chosen repositories, and an admin who removes a repository takes its
 * line out of the install script that they change.
 */
function acmeAfter(change: RepositoryChange): SettingsOrg {
  if (change === 'none') return acme
  const repositories = changedAcmeRepositories(change)
  const chosen = repositories
    .filter((repository) => repository.used)
    .map((repository) => repository.name)
  const { removed } = changedNames(change)
  return {
    ...acme,
    repositories,
    computer: {
      ...acme.computer,
      logs: { ...acme.computer.logs, building: acmeBuildLog(chosen) },
      changedInstallScript:
        removed.length > 0
          ? installScriptWithout(removed)
          : acme.computer.changedInstallScript,
    },
  }
}

/**
 * Acme in a state of its skills repository, with what the lookup of the
 * saved repository found, as `settingsSkills.ts` gives them.
 */
function acmeWithSkills(state: OrgSettingsState): SettingsOrg {
  const settings = acmeAfter(state.repositoryChange)
  return {
    ...settings,
    computer: { ...settings.computer, ...acmeSkillsComputer(state) },
  }
}

/**
 * The org of the settings: Acme in use, Acme suspended, or Firna. Acme
 * shows the saved change of its repositories and its skills repository
 * of the state.
 */
export function settingsOrg(state: OrgSettingsState): SettingsOrg {
  switch (state.org) {
    case 'active':
      return acmeWithSkills(state)
    case 'suspended':
      return {
        ...acmeWithSkills(state),
        list: paths.suspendedOrg,
        sections: suspendedSections(),
        links: suspendedSettingsLinks,
      }
    case 'new':
      return firna(state.build)
  }
}
