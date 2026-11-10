import type { ReactNode } from 'react'
import { ChevronDown, FolderGit2, Sparkles } from 'lucide-react'
import { ActionButton } from '../components/common/actions'
import { acmeRail, type RailState } from '../components/layout/OrgRail'
import { BranchLine } from '../components/new-workspace/BranchLine'
import {
  ChooseRepositoriesButton,
  chooseRepositoriesFirst,
} from '../components/new-workspace/notices'
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
import { newOrg, newOrgDraft, repositories } from '../fixtures/repositories'
import { savedCarts } from '../fixtures/workspaces'
import { paths } from '../paths'
import type { NewWorkspaceState } from './NewWorkspaceScreen'
import { newWorkspaceChoice } from './newWorkspaceParts'
import styles from './NewWorkspaceScreen.module.css'

/** The org of the New workspace page, and the draft of its first message. */
export type PageOrg = {
  org: Org
  /** The repository of the new workspace. */
  repository: string
  draft: string
  choice: AgentChoice
  /** When the build that new workspaces start from ended, if there is one. */
  built?: string
  /** The workspace list of the org. */
  list: string
}

/** Acme, whose new workspaces start from the build of 8 hours ago. */
const acmePage: PageOrg = {
  org: orgs.acme,
  repository: repositories[savedCarts.repository].name,
  draft: savedCartsMessage,
  choice: newWorkspaceChoice,
  built: lastBuild.when,
  list: paths.shell,
}

/**
 * The org of the page: Acme in use or suspended, or Firna, the new org of
 * the sign-up. Firna has a build to start from only after its first build
 * succeeded.
 */
export function pageOrg(state: NewWorkspaceState): PageOrg {
  switch (state.org) {
    case 'active':
      return acmePage
    case 'suspended':
      return { ...acmePage, list: paths.suspendedOrg }
    case 'new':
      return {
        org: orgs.firna,
        repository: newOrg.repositories[0].name,
        draft: newOrgDraft,
        choice: defaultChoice,
        built:
          state.firstBuild === 'succeeded' ? firstGoodBuild.when : undefined,
        list: paths.newOrg,
      }
  }
}

/**
 * The start of an empty chat, with the repository of the new workspace.
 * The line under the repository names the branch, a new one by default,
 * with a quiet link that changes it. The note names the build that the
 * workspace starts from. Before the first good build there is none, and
 * the notice over the composer says why.
 */
export function Start(props: {
  page: PageOrg
  chosen: boolean
  admin: boolean
  state: NewWorkspaceState
  phone: boolean
}) {
  return (
    <div className={styles.start}>
      <Sparkles aria-hidden className={styles.icon} size={26} />
      <h2 className={styles.title}>Start a workspace</h2>
      <p className={styles.body}>
        {props.chosen
          ? 'Your first message creates it.'
          : props.admin
            ? `${chooseRepositoriesFirst(props.page.org.name)}.`
            : `An admin of ${props.page.org.name} chooses its repositories first.`}
      </p>
      {props.chosen ? (
        <ActionButton
          accessibilityLabel={`Repository: ${props.page.repository}`}
          icon={FolderGit2}
          menu
          trailing={
            <ChevronDown aria-hidden className={styles.chevron} size={13} />
          }
        >
          {props.page.repository}
        </ActionButton>
      ) : props.admin ? (
        <ChooseRepositoriesButton />
      ) : null}
      {props.chosen ? (
        <BranchLine
          choice={props.state.branch}
          phone={props.phone}
          picker={props.state.picker}
        />
      ) : null}
      {props.chosen && props.page.built ? (
        <p className={styles.note}>
          Starts from the cloud computer of {props.page.org.name}, built{' '}
          {props.page.built}.
        </p>
      ) : null}
    </div>
  )
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
          viewer={viewer}
        />
      )
  }
}
