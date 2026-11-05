import type { SchemaProps, Viewport } from '@mokly/mokly'
import { ChevronDown, CircleAlert, FolderGit2, Sparkles } from 'lucide-react'
import { ChatPane } from '../components/chat/ChatPane'
import { ActionButton } from '../components/common/actions'
import { Notice } from '../components/common/Notice'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import { Page } from '../components/layout/Page'
import {
  freeOrgSections,
  workspaceSections,
} from '../components/workspaces/sections'
import { Sidebar } from '../components/workspaces/Sidebar'
import { lastBuild } from '../fixtures/computer'
import { savedCartsMessage } from '../fixtures/conversations'
import { orgList, orgs } from '../fixtures/orgs'
import { repositories } from '../fixtures/repositories'
import { savedCarts } from '../fixtures/workspaces'
import { paths } from '../paths'
import { limitKeys, limitOrg, LimitView } from './limitViews'
import styles from './NewWorkspaceScreen.module.css'

export const newWorkspaceSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['result', 'limit'],
  properties: {
    result: { enum: ['form', 'error'] },
    /** A limit that stops the new workspace, in place of the empty chat. */
    limit: { enum: limitKeys },
  },
} as const

export type NewWorkspaceState = SchemaProps<typeof newWorkspaceSchema>

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

/** The empty chat and its composer. The first message creates the workspace. */
function NewChat(props: { failed: boolean; viewport: Viewport }) {
  const notice = props.failed ? (
    <Notice
      action={<ActionButton tone="primary">Try again</ActionButton>}
      body="Its sandbox didn't start. Your message is kept."
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
        sendTo: props.failed ? undefined : paths.creating,
      }}
      empty={<Start />}
      items={[]}
      notice={notice}
      viewport={props.viewport}
    />
  )
}

/**
 * A new workspace as an empty chat: the repository, and the composer with
 * its files and its model. The first message creates the workspace, and the
 * app names it and its branch. At a limit, the page gives the one way
 * forward in place of the chat.
 */
export function NewWorkspaceScreen(props: {
  state: NewWorkspaceState
  viewport: Viewport
}) {
  const { limit } = props.state
  const org = limitOrg(limit)
  const free = org.key === 'firna'
  const mobile = props.viewport === 'mobile'
  const list = free ? paths.newOrg : paths.shell
  const page = (
    <Page
      back={mobile ? { label: 'Workspaces', to: list } : undefined}
      fill
      subtitle={org.name}
      title="New workspace"
      viewport={props.viewport}
    >
      {limit === 'none' ? (
        <NewChat
          failed={props.state.result === 'error'}
          viewport={props.viewport}
        />
      ) : (
        <LimitView limit={limit} />
      )}
    </Page>
  )
  if (mobile) return <MobileFrame>{page}</MobileFrame>
  const sidebar = (
    <Sidebar
      current="new-workspace"
      org={org}
      sections={free ? freeOrgSections() : workspaceSections()}
    />
  )
  return (
    <AppFrame rail={{ orgs: orgList, current: org.key }} sidebar={sidebar}>
      {page}
    </AppFrame>
  )
}
