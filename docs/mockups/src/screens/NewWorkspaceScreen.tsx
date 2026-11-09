import type { ReactNode } from 'react'
import type { SchemaProps, Viewport } from '@mokly/mokly'
import { CircleAlert } from 'lucide-react'
import { ChatPane } from '../components/chat/ChatPane'
import { ActionButton } from '../components/common/actions'
import { Notice } from '../components/common/Notice'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import { Page } from '../components/layout/Page'
import { useMacApp } from '../components/mac/MacApp'
import { orgSuspendedReason } from '../components/orgs/suspension'
import { firstBuildStates } from '../fixtures/computer'
import { memberViewer, you } from '../fixtures/members'
import { paths } from '../paths'
import { FirstBuildNotice } from './firstBuildNotice'
import { pageOrg, railOf, sidebarOf, Start } from './newWorkspaceParts'

export const newWorkspaceSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['result', 'org', 'firstBuild', 'viewer'],
  properties: {
    /**
     * The empty form, or a create request that failed, whose message stays
     * for Try again. A failed first start keeps its workspace instead.
     */
    result: { enum: ['form', 'error'] },
    /**
     * The org: Acme in use, Acme suspended by the operator, or Firna, the
     * new org of the sign-up, before its first workspace. A suspended org
     * refuses every create, so the page shows the refused bar of a
     * workspace in place of the composer, with the words of the org.
     */
    org: { enum: ['active', 'suspended', 'new'] },
    /**
     * The first build of the cloud computer of Firna. Until it succeeds,
     * a notice over the composer shows its state, and Send is off. Acme
     * has a good build, so a later build leaves its page as it is.
     */
    firstBuild: { enum: firstBuildStates },
    /**
     * The person signed in: Cal, an admin, or Priya, a member who is not.
     * Only an admin gets the link of the notice to the Cloud computer tab.
     */
    viewer: { enum: ['admin', 'member'] },
  },
} as const

export type NewWorkspaceState = SchemaProps<typeof newWorkspaceSchema>

/** The empty chat of a new workspace in an org in use. */
export const newWorkspaceForm: NewWorkspaceState = {
  result: 'form',
  org: 'active',
  firstBuild: 'succeeded',
  viewer: 'admin',
}

/**
 * The body of a create request that failed, such as when the app could
 * not reach the server.
 */
const requestFailed = "The app can't reach the server. Your message is kept."

/**
 * The notice over the composer: the first build of a new org while the
 * org has no good image, or a create request that failed.
 */
function notice(state: NewWorkspaceState): ReactNode {
  if (state.org === 'new' && state.firstBuild !== 'succeeded') {
    return (
      <FirstBuildNotice
        admin={state.viewer === 'admin'}
        build={state.firstBuild}
      />
    )
  }
  // A suspended org refuses each create, so no create of it failed.
  if (state.org === 'suspended' || state.result === 'form') return undefined
  return (
    <Notice
      action={<ActionButton tone="primary">Try again</ActionButton>}
      body={requestFailed}
      icon={CircleAlert}
      title="The workspace wasn't created"
      tone="danger"
    />
  )
}

/**
 * The empty chat and its composer. The first message creates the workspace.
 * When the create request fails, the message stays in the composer, and
 * Try again sends it again. In a suspended org the refused bar takes the
 * place of the composer, and the chat invites no first message, because the
 * org refuses the create. While a new org has no good image, Send is off and
 * the draft stays.
 */
function NewChat(props: { state: NewWorkspaceState; viewport: Viewport }) {
  const { state } = props
  const page = pageOrg(state)
  const suspended = state.org === 'suspended'
  const waits = state.org === 'new' && state.firstBuild !== 'succeeded'
  const failed = !suspended && state.result === 'error'
  return (
    <ChatPane
      composer={{
        attachments: [],
        blocked: waits,
        choice: page.choice,
        draft: page.draft,
        placeholder: 'Describe the task',
        running: false,
        // Send leads to the start of Lisbon, a new workspace of Acme.
        sendTo: failed || state.org === 'new' ? undefined : paths.creating,
      }}
      empty={suspended ? undefined : <Start page={page} />}
      items={[]}
      notice={notice(state)}
      problem={
        suspended
          ? { problem: 'refused', reason: orgSuspendedReason }
          : undefined
      }
      viewer={state.viewer === 'admin' ? you : memberViewer}
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
  const { state } = props
  const mobile = props.viewport === 'mobile'
  const org = pageOrg(state)
  const page = (
    <Page
      back={mobile ? { label: 'Workspaces', to: org.list } : undefined}
      fill
      subtitle={org.org.name}
      title="New workspace"
      viewport={props.viewport}
    >
      <NewChat state={state} viewport={props.viewport} />
    </Page>
  )
  if (mobile) return <MobileFrame>{page}</MobileFrame>
  return (
    <AppFrame rail={railOf(state)} sidebar={sidebarOf(state, mac?.needsInput)}>
      {page}
    </AppFrame>
  )
}
