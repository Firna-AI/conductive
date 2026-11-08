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
  envVars,
  failedBuild,
  firnaInstallScript,
  firstGoodBuild,
  installScript,
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
import {
  acmeRepositories,
  newOrg,
  type ReachableRepository,
} from '../fixtures/repositories'
import {
  buildLog,
  failedBuildLog,
  failedFirstBuildLog,
  firstBuildLog,
  timedOutBuildLog,
  timedOutFirstBuildLog,
} from '../fixtures/terminal'
import { type Workspace, workspaceList } from '../fixtures/workspaces'
import { paths } from '../paths'
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
      failed: failedBuildLog,
      'time-limit': timedOutBuildLog,
    },
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

/**
 * The builds of Firna, the new org of the sign-up, in a state of its tab.
 * Firna has no good build until its first build succeeds. The history
 * lists the builds that ended.
 */
function firnaBuilds(build: BuildState): Omit<OrgBuilds, 'logs'> {
  switch (build) {
    case 'ready':
    case 'changed':
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

/** The org of the settings: Acme in use, Acme suspended, or Firna. */
export function settingsOrg(state: OrgSettingsState): SettingsOrg {
  switch (state.org) {
    case 'active':
      return acme
    case 'suspended':
      return {
        ...acme,
        list: paths.suspendedOrg,
        sections: suspendedSections(),
        links: suspendedSettingsLinks,
      }
    case 'new':
      return firna(state.build)
  }
}
