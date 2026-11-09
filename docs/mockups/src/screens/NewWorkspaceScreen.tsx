import type { SchemaProps, Viewport } from '@mokly/mokly'
import { ChevronDown, CircleAlert, FolderGit2, Sparkles } from 'lucide-react'
import { ChatPane } from '../components/chat/ChatPane'
import { ActionButton } from '../components/common/actions'
import { Notice } from '../components/common/Notice'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import { acmeRail } from '../components/layout/OrgRail'
import { Page } from '../components/layout/Page'
import { useMacApp } from '../components/mac/MacApp'
import {
  suspendedSections,
  workspaceSections,
} from '../components/workspaces/sections'
import { orgSuspendedReason } from '../components/orgs/suspension'
import { Sidebar } from '../components/workspaces/Sidebar'
import { lastBuild } from '../fixtures/computer'
import { you } from '../fixtures/members'
import { savedCartsMessage } from '../fixtures/newWorkspaceConversations'
import { orgs, suspendedOrg } from '../fixtures/orgs'
import { repositories } from '../fixtures/repositories'
import { savedCarts } from '../fixtures/workspaces'
import { paths } from '../paths'
import styles from './NewWorkspaceScreen.module.css'

export const newWorkspaceSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['result', 'org'],
  properties: {
    /**
     * The empty form, or a create request that failed, whose message stays
     * for Try again. A failed first start keeps its workspace instead.
     */
    result: { enum: ['form', 'error'] },
    /**
     * The org: in use, or suspended by the operator. A suspended org
     * refuses every create, so the page shows the refused bar of a
     * workspace in place of the composer, with the words of the org.
     */
    org: { enum: ['active', 'suspended'] },
  },
} as const

export type NewWorkspaceState = SchemaProps<typeof newWorkspaceSchema>

/** The empty chat of a new workspace in an org in use. */
export const newWorkspaceForm: NewWorkspaceState = {
  result: 'form',
  org: 'active',
}

/**
 * The body of a create request that failed, such as when the app could
 * not reach the server.
 */
const requestFailed = "The app can't reach the server. Your message is kept."

const repository = repositories[savedCarts.repository]

/** The start of an empty chat, with the repository of the new workspace. */
function Start() {
  return (
    <div className={styles.start}>
      <Sparkles aria-hidden className={styles.icon} size={26} />
      <h2 className={styles.title}>Start a workspace</h2>
      <p className={styles.body}>
        Your first message creates it, on a new branch of the repository.
      </p>
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
      <p className={styles.note}>
        Starts from the cloud computer of {orgs.acme.name}, built{' '}
        {lastBuild.when}.
      </p>
    </div>
  )
}

/**
 * The empty chat and its composer. The first message creates the workspace.
 * When the create request fails, the message stays in the composer, and
 * Try again sends it again. In a suspended org the refused bar takes the
 * place of the composer, and the chat invites no first message, because the
 * org refuses the create.
 */
function NewChat(props: { state: NewWorkspaceState; viewport: Viewport }) {
  const suspended = props.state.org === 'suspended'
  // A suspended org refuses each create, so no create of it failed.
  const failed = !suspended && props.state.result === 'error'
  const notice = failed ? (
    <Notice
      action={<ActionButton tone="primary">Try again</ActionButton>}
      body={requestFailed}
      icon={CircleAlert}
      title="The workspace wasn't created"
      tone="danger"
    />
  ) : undefined
  return (
    <ChatPane
      composer={{
        attachments: [],
        choice: savedCarts.choice,
        draft: savedCartsMessage,
        placeholder: 'Describe the task',
        running: false,
        sendTo: failed ? undefined : paths.creating,
      }}
      empty={suspended ? undefined : <Start />}
      items={[]}
      notice={notice}
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
      subtitle={orgs.acme.name}
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
        sidebar={
          <Sidebar org={orgs.acme} sections={suspendedSections()} suspended />
        }
      >
        {page}
      </AppFrame>
    )
  }
  const sidebar = (
    <Sidebar
      current="new-workspace"
      org={orgs.acme}
      sections={workspaceSections(undefined, mac?.needsInput)}
    />
  )
  return <AppFrame sidebar={sidebar}>{page}</AppFrame>
}
