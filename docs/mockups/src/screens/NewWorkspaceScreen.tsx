import type { SchemaProps, Viewport } from '@mokly/mokly'
import { ChevronDown, CircleAlert, FolderGit2, Sparkles } from 'lucide-react'
import { ChatPane } from '../components/chat/ChatPane'
import { ActionButton } from '../components/common/actions'
import { Notice } from '../components/common/Notice'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import { Page } from '../components/layout/Page'
import { useMacApp } from '../components/mac/MacApp'
import { workspaceSections } from '../components/workspaces/sections'
import { Sidebar } from '../components/workspaces/Sidebar'
import { lastBuild } from '../fixtures/computer'
import { savedCartsMessage } from '../fixtures/conversations'
import { you } from '../fixtures/members'
import { orgs } from '../fixtures/orgs'
import { repositories } from '../fixtures/repositories'
import { startErrors } from '../fixtures/starting'
import { savedCarts } from '../fixtures/workspaces'
import { paths } from '../paths'
import styles from './NewWorkspaceScreen.module.css'

export const newWorkspaceSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['result'],
  properties: {
    /**
     * The empty form, or a create whose first start failed: a failure, or
     * the 20-minute limit of a start.
     */
    result: { enum: ['form', 'error', 'time-limit'] },
  },
} as const

export type NewWorkspaceState = SchemaProps<typeof newWorkspaceSchema>

type CreateFailure = Exclude<NewWorkspaceState['result'], 'form'>

/**
 * The body of a create whose first start failed. A start that passed its
 * limit shows the message that the app saved for it.
 */
const failureBodies: Readonly<Record<CreateFailure, string>> = {
  error: "Its sandbox didn't start. Your message is kept.",
  'time-limit': `${startErrors['time-limit']} Your message is kept.`,
}

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
function NewChat(props: {
  result: NewWorkspaceState['result']
  viewport: Viewport
}) {
  const failed = props.result !== 'form'
  const notice =
    props.result === 'form' ? undefined : (
      <Notice
        action={<ActionButton tone="primary">Try again</ActionButton>}
        body={failureBodies[props.result]}
        icon={CircleAlert}
        title="The workspace wasn't created"
        tone="danger"
      />
    )
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
      empty={<Start />}
      items={[]}
      notice={notice}
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
  const page = (
    <Page
      back={mobile ? { label: 'Workspaces', to: paths.shell } : undefined}
      fill
      subtitle={orgs.acme.name}
      title="New workspace"
      viewport={props.viewport}
    >
      <NewChat result={props.state.result} viewport={props.viewport} />
    </Page>
  )
  if (mobile) return <MobileFrame>{page}</MobileFrame>
  const sidebar = (
    <Sidebar
      current="new-workspace"
      org={orgs.acme}
      sections={workspaceSections(undefined, mac?.needsInput)}
    />
  )
  return <AppFrame sidebar={sidebar}>{page}</AppFrame>
}
