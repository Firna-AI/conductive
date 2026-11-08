import type { SchemaProps, Viewport } from '@mokly/mokly'
import { ChevronDown, FolderGit2, Sparkles } from 'lucide-react'
import { ChatPane } from '../components/chat/ChatPane'
import { ActionButton } from '../components/common/actions'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import { acmeRail } from '../components/layout/OrgRail'
import { Page } from '../components/layout/Page'
import { useMacApp } from '../components/mac/MacApp'
import {
  ChooseRepositoriesButton,
  chooseRepositoriesFirst,
} from '../components/new-workspace/notices'
import {
  suspendedSections,
  workspaceSections,
} from '../components/workspaces/sections'
import { orgSuspendedReason } from '../components/orgs/suspension'
import { Sidebar } from '../components/workspaces/Sidebar'
import { lastBuild } from '../fixtures/computer'
import { you } from '../fixtures/members'
import { orgs, suspendedOrg } from '../fixtures/orgs'
import { repositories } from '../fixtures/repositories'
import { savedCarts } from '../fixtures/workspaces'
import { paths } from '../paths'
import {
  formNotices,
  newWorkspaceChoice,
  newWorkspaceDrafts,
  newWorkspaceFormProperties,
  taskPlaceholder,
  waits,
} from './newWorkspaceParts'
import styles from './NewWorkspaceScreen.module.css'

export const newWorkspaceSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['draft', 'login', 'repositories', 'result', 'org'],
  properties: {
    ...newWorkspaceFormProperties,
    /**
     * The form, or a create that failed: its first start failed, or passed
     * the 20-minute limit of a start, or the create request did not reach
     * the server.
     */
    result: { enum: ['form', 'error', 'time-limit', 'unreachable'] },
    /**
     * The org: in use, or suspended by the operator. A suspended org
     * refuses every create, so the page shows the refused bar of a
     * workspace in place of the composer, with the words of the org.
     */
    org: { enum: ['active', 'suspended'] },
  },
} as const

export type NewWorkspaceState = SchemaProps<typeof newWorkspaceSchema>

/** The chat of a new workspace in an org in use, with the task written. */
export const newWorkspaceForm: NewWorkspaceState = {
  draft: 'message',
  login: 'connected',
  repositories: 'chosen',
  result: 'form',
  org: 'active',
}

const repository = repositories[savedCarts.repository]
const org = orgs.acme

/**
 * The start of an empty chat, with the repository of the new workspace. An
 * org without chosen repositories asks for them first, and an admin gets
 * Choose repositories in place of the picker.
 */
function Start(props: { chosen: boolean }) {
  return (
    <div className={styles.start}>
      <Sparkles aria-hidden className={styles.icon} size={26} />
      <h2 className={styles.title}>Start a workspace</h2>
      <p className={styles.body}>
        {props.chosen
          ? 'Your first message creates it, on a new branch of the repository.'
          : `${chooseRepositoriesFirst(org.name)}.`}
      </p>
      {props.chosen ? (
        <ActionButton
          accessibilityLabel={`Repository: ${repository.name}`}
          icon={FolderGit2}
          menu
          trailing={
            <ChevronDown aria-hidden className={styles.chevron} size={13} />
          }
        >
          {repository.name}
        </ActionButton>
      ) : (
        <ChooseRepositoriesButton />
      )}
      {props.chosen ? (
        <p className={styles.note}>
          Starts from the cloud computer of {org.name}, built {lastBuild.when}.
        </p>
      ) : null}
    </div>
  )
}

/**
 * The empty chat and its composer. The first message creates the workspace.
 * In a suspended org the refused bar takes the place of the composer, and
 * the chat invites no first message, because the org refuses the create.
 */
function NewChat(props: { state: NewWorkspaceState; viewport: Viewport }) {
  const { state } = props
  const suspended = state.org === 'suspended'
  // A suspended org refuses each create, so no create of it failed.
  const failure =
    suspended || state.result === 'form' ? undefined : state.result
  const draft = newWorkspaceDrafts[state.draft]
  return (
    <ChatPane
      composer={{
        attachments: draft.attachments,
        blocked: waits(state),
        choice: newWorkspaceChoice,
        draft: draft.text,
        placeholder: taskPlaceholder,
        running: false,
        sendTo: failure || draft.text === '' ? undefined : paths.creating,
      }}
      empty={
        suspended ? undefined : (
          <Start chosen={state.repositories === 'chosen'} />
        )
      }
      items={[]}
      notice={suspended ? undefined : formNotices(state, failure)}
      problem={
        suspended
          ? { problem: 'refused', reason: orgSuspendedReason }
          : undefined
      }
      viewer={you}
      viewport={props.viewport}
    />
  )
}

/**
 * A new workspace as an empty chat: the repository, and the composer with
 * its files and its model. The first message creates the workspace, and the
 * app names it and its branch.
 */
export function NewWorkspaceScreen(props: {
  state: NewWorkspaceState
  viewport: Viewport
}) {
  const mac = useMacApp()
  const mobile = props.viewport === 'mobile'
  const suspended = props.state.org === 'suspended'
  const list = suspended ? paths.suspendedOrg : paths.shell
  const page = (
    <Page
      back={mobile ? { label: 'Workspaces', to: list } : undefined}
      fill
      subtitle={org.name}
      title="New workspace"
      viewport={props.viewport}
    >
      <NewChat state={props.state} viewport={props.viewport} />
    </Page>
  )
  if (mobile) return <MobileFrame>{page}</MobileFrame>
  if (suspended) {
    // The sidebar of a suspended org has no New workspace to select.
    return (
      <AppFrame
        rail={{ ...acmeRail, suspended: suspendedOrg }}
        sidebar={<Sidebar org={org} sections={suspendedSections()} suspended />}
      >
        {page}
      </AppFrame>
    )
  }
  const sidebar = (
    <Sidebar
      current="new-workspace"
      org={org}
      sections={workspaceSections(undefined, mac?.needsInput)}
    />
  )
  return <AppFrame sidebar={sidebar}>{page}</AppFrame>
}
