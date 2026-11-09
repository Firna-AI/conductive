import type { SchemaProps, Viewport } from '@mokly/mokly'
import { ChatPane } from '../components/chat/ChatPane'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import { Page } from '../components/layout/Page'
import { useMacApp } from '../components/mac/MacApp'
import { orgSuspendedReason } from '../components/orgs/suspension'
import { firstBuildStates } from '../fixtures/computer'
import { memberViewer, you } from '../fixtures/members'
import { paths } from '../paths'
import { FirstBuildNotice } from './firstBuildNotice'
import { pageOrg, railOf, sidebarOf, Start } from './newWorkspacePageParts'
import {
  formNotices,
  newWorkspaceDrafts,
  newWorkspaceFormProperties,
  taskPlaceholder,
  waits,
} from './newWorkspaceParts'

export const newWorkspaceSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'draft',
    'login',
    'repositories',
    'result',
    'org',
    'firstBuild',
    'viewer',
  ],
  properties: {
    ...newWorkspaceFormProperties,
    /** A form, or a failed create request that keeps the draft. */
    result: { enum: ['form', 'error'] },
    /** Acme in use or suspended, or Firna before its first workspace. */
    org: { enum: ['active', 'suspended', 'new'] },
    /** Firna needs its first good build before a message can go. */
    firstBuild: { enum: firstBuildStates },
    /** Only an admin gets the link to the Cloud computer tab. */
    viewer: { enum: ['admin', 'member'] },
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
  firstBuild: 'succeeded',
  viewer: 'admin',
}

/**
 * The empty chat and its composer. A failed create keeps the message for
 * Try again. A suspended org shows the refused bar. Before the first good
 * build, the draft stays and Send is off.
 */
function NewChat(props: { state: NewWorkspaceState; viewport: Viewport }) {
  const { state } = props
  const page = pageOrg(state)
  const suspended = state.org === 'suspended'
  const building = state.org === 'new' && state.firstBuild !== 'succeeded'
  const failed = !suspended && state.result === 'error'
  const draft = newWorkspaceDrafts[state.draft]
  const text =
    state.org === 'new' && state.draft !== 'empty' ? page.draft : draft.text
  const notices = formNotices(state, failed, !building)
  if (state.org === 'new' && state.firstBuild !== 'succeeded') {
    notices.splice(
      failed ? 1 : 0,
      0,
      <FirstBuildNotice
        admin={state.viewer === 'admin'}
        build={state.firstBuild}
        key="first-build"
      />,
    )
  }
  return (
    <ChatPane
      composer={{
        attachments: draft.attachments,
        blocked: building || waits(state),
        choice: page.choice,
        draft: text,
        placeholder: taskPlaceholder,
        running: false,
        sendTo:
          failed || state.org === 'new' || text === ''
            ? undefined
            : paths.creating,
      }}
      empty={
        suspended ? undefined : (
          <Start
            page={page}
            chosen={state.repositories === 'chosen'}
            admin={state.viewer === 'admin'}
          />
        )
      }
      items={[]}
      notice={suspended ? undefined : notices}
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

/** A New workspace page with the repositories and the composer of its org. */
export function NewWorkspaceScreen(props: {
  state: NewWorkspaceState
  viewport: Viewport
}) {
  const mac = useMacApp()
  const { state } = props
  const mobile = props.viewport === 'mobile'
  const pageOrgData = pageOrg(state)
  const page = (
    <Page
      back={mobile ? { label: 'Workspaces', to: pageOrgData.list } : undefined}
      fill
      subtitle={pageOrgData.org.name}
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
