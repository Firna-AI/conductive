import type { SchemaProps, Viewport } from '@mokly/mokly'
import { ChevronDown, CircleAlert, FolderGit2, Sparkles } from 'lucide-react'
import { ChatPane } from '../components/chat/ChatPane'
import { ActionButton } from '../components/common/actions'
import { Notice } from '../components/common/Notice'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import { Page } from '../components/layout/Page'
import { workspaceSections } from '../components/workspaces/sections'
import { Sidebar } from '../components/workspaces/Sidebar'
import { lastBuild } from '../fixtures/computer'
import { savedCartsMessage } from '../fixtures/conversations'
import { orgs } from '../fixtures/orgs'
import { repositories } from '../fixtures/repositories'
import { savedCarts } from '../fixtures/workspaces'
import { paths } from '../paths'
import styles from './NewWorkspaceScreen.module.css'

export const newWorkspaceSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['result'],
  properties: {
    result: { enum: ['form', 'error'] },
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

/**
 * A new workspace as an empty chat: the repository, and the composer with
 * its files and its model. The first message creates the workspace, and the
 * app names it and its branch.
 */
export function NewWorkspaceScreen(props: {
  state: NewWorkspaceState
  viewport: Viewport
}) {
  const failed = props.state.result === 'error'
  const mobile = props.viewport === 'mobile'
  const notice = failed ? (
    <Notice
      action={<ActionButton tone="primary">Try again</ActionButton>}
      body="Its sandbox didn't start. Your message is kept."
      icon={CircleAlert}
      title="The workspace wasn't created"
      tone="danger"
    />
  ) : undefined
  const page = (
    <Page
      back={mobile ? { label: 'Workspaces', to: paths.shell } : undefined}
      fill
      subtitle={orgs.acme.name}
      title="New workspace"
      viewport={props.viewport}
    >
      <ChatPane
        composer={{
          attachments: [],
          choice: savedCarts.choice,
          draft: savedCartsMessage,
          placeholder: 'Describe the task',
          running: false,
          sendTo: failed ? undefined : paths.creating,
        }}
        empty={<Start />}
        items={[]}
        notice={notice}
        viewport={props.viewport}
      />
    </Page>
  )
  if (mobile) return <MobileFrame>{page}</MobileFrame>
  const sidebar = (
    <Sidebar
      current="new-workspace"
      org={orgs.acme}
      sections={workspaceSections()}
    />
  )
  return <AppFrame sidebar={sidebar}>{page}</AppFrame>
}
