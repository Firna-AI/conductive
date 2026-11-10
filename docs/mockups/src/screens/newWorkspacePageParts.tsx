import type { ReactNode } from 'react'
import { acmeRail, type RailState } from '../components/layout/OrgRail'
import {
  newOrgSections,
  suspendedSections,
  workspaceSections,
} from '../components/workspaces/sections'
import { Sidebar } from '../components/workspaces/Sidebar'
import { type AgentChoice, defaultChoice } from '../fixtures/agents'
import { firstGoodBuild, lastBuild } from '../fixtures/computer'
import { savedCartsMessage } from '../fixtures/newWorkspaceConversations'
import { memberViewer, people, viewerMembership } from '../fixtures/members'
import { type Org, orgList, orgs, suspendedOrg } from '../fixtures/orgs'
import {
  addedRepositoryDraft,
  newOrg,
  newOrgDraft,
} from '../fixtures/repositories'
import { paths } from '../paths'
import type { NewWorkspaceState } from './NewWorkspaceScreen'
import { newWorkspaceChoice } from './newWorkspaceParts'
import {
  acmeFormRepositories,
  type FormRepositories,
  formWait,
} from './newWorkspaceRepositories'

/**
 * The org of the New workspace page, its chosen repositories with the one
 * of the form, and the draft of its first message.
 */
export type PageOrg = FormRepositories & {
  org: Org
  draft: string
  choice: AgentChoice
  /** When the build that new workspaces start from ended, if there is one. */
  built?: string
  /** The workspace list of the org. */
  list: string
}

/**
 * Acme, whose new workspaces start from the build of 8 hours ago. A kept
 * draft in a waiting repository holds a task for that repository.
 */
function acmePage(state: NewWorkspaceState): PageOrg {
  const form = acmeFormRepositories(state.repositories)
  return {
    ...form,
    org: orgs.acme,
    draft: formWait(form) ? addedRepositoryDraft : savedCartsMessage,
    choice: newWorkspaceChoice,
    built: lastBuild.when,
    list: paths.shell,
  }
}

/** The repositories that Firna chose, which its first build clones. */
const firnaReady = newOrg.repositories
  .filter((repository) => repository.used)
  .map((repository) => repository.name)

/**
 * The org of the page: Acme in use or suspended, or Firna, the new org of
 * the sign-up. Firna has a build to start from only after its first build
 * succeeded, and its repositories never wait.
 */
export function pageOrg(state: NewWorkspaceState): PageOrg {
  switch (state.org) {
    case 'active':
      return acmePage(state)
    case 'suspended':
      return { ...acmePage(state), list: paths.suspendedOrg }
    case 'new':
      return {
        org: orgs.firna,
        ready: firnaReady,
        waiting: [],
        repository: newOrg.repositories[0].name,
        draft: newOrgDraft,
        choice: defaultChoice,
        built:
          state.firstBuild === 'succeeded' ? firstGoodBuild.when : undefined,
        list: paths.newOrg,
      }
  }
}

/** The rail of the page, with the person signed in. */
export function railOf(state: NewWorkspaceState): RailState {
  const person = state.viewer === 'admin' ? undefined : people[memberViewer]
  if (state.org === 'new') return { orgs: orgList, current: 'firna', person }
  if (state.org === 'suspended') {
    return { ...acmeRail, suspended: suspendedOrg, person }
  }
  return { ...acmeRail, person }
}

/**
 * Whether the newest build of Acme failed, which the page draws while a
 * repository waits. The Settings link then shows a dot, as after every
 * failed build.
 */
function acmeBuildFailed(state: NewWorkspaceState): boolean {
  const { waiting } = acmeFormRepositories(state.repositories)
  return state.waitingBuild === 'failed' && waiting.length > 0
}

/**
 * The sidebar of the org, with New workspace selected. `needsInput` is a
 * workspace whose agent waits for the user, which only the Mac app draws.
 */
export function sidebarOf(
  state: NewWorkspaceState,
  needsInput?: string,
): ReactNode {
  const viewer = viewerMembership(state.viewer)
  switch (state.org) {
    case 'suspended':
      // The sidebar of a suspended org has no New workspace to select.
      return (
        <Sidebar
          org={orgs.acme}
          sections={suspendedSections()}
          suspended
          viewer={viewer}
        />
      )
    case 'new':
      return (
        <Sidebar
          current="new-workspace"
          newWorkspaceTo={paths.firstBuildWorkspace}
          org={orgs.firna}
          sections={newOrgSections()}
          settingsAlert={state.firstBuild === 'failed'}
          viewer={viewer}
        />
      )
    case 'active':
      return (
        <Sidebar
          current="new-workspace"
          org={orgs.acme}
          sections={workspaceSections(undefined, needsInput)}
          settingsAlert={acmeBuildFailed(state)}
          viewer={viewer}
        />
      )
  }
}
