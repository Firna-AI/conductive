import type { SchemaProps, Viewport } from '@mokly/mokly'
import { ChatPane } from '../components/chat/ChatPane'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import { Page } from '../components/layout/Page'
import { useMacApp } from '../components/mac/MacApp'
import { orgSuspendedReason } from '../components/orgs/suspension'
import { firstBuildStates } from '../fixtures/computer'
import { memberViewer, you } from '../fixtures/members'
import type { ShortcutChanges } from '../fixtures/shortcutChanges'
import { paths } from '../paths'
import { FirstBuildNotice } from './firstBuildNotice'
import { pageOrg, railOf, sidebarOf, Start } from './newWorkspacePageParts'
import {
  formNotices,
  newWorkspaceDraft,
  newWorkspaceFormProperties,
  taskPlaceholder,
  waits,
} from './newWorkspaceParts'

export const newWorkspaceSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'draft',
    'files',
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
  files: 'none',
  login: 'connected',
  repositories: 'chosen',
  result: 'form',
  org: 'active',
  firstBuild: 'succeeded',
  viewer: 'admin',
}

/**
 * The empty chat and its composer. The files of the first message upload
 * before the workspace exists, and Send waits for them. A failed create
 * keeps the message for Try again. A suspended org shows the refused bar.
 * Before the first good build, the draft stays and Send is off.
 */
function NewChat(props: { state: NewWorkspaceState; viewport: Viewport }) {
  const { state } = props
  const page = pageOrg(state)
  const suspended = state.org === 'suspended'
  const building = state.org === 'new' && state.firstBuild !== 'succeeded'
  const failed = !suspended && state.result === 'error'
  const draft = newWorkspaceDraft(state)
  // Send leads to the create flow, which draws the task of Saved carts.
  const linked = state.draft === 'workspace-link'
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
  // A first message with files leads to the screen of its queued files.
  // The file screens draw the Saved carts task of Acme, so the attach button
  // of Firna and of a linked task leads nowhere.
  const created =
    state.files === 'ready' ? paths.attachmentsQueued : paths.creating
  return (
    <ChatPane
      composer={{
        attachments: draft.files,
        attachTo:
          state.files === 'none' && !failed && !linked && state.org !== 'new'
            ? paths.newWorkspaceFiles
            : undefined,
        blocked: building || waits(state),
        choice: page.choice,
        draft: text,
        placeholder: taskPlaceholder,
        running: false,
        sendTo:
          failed || linked || state.org === 'new' || text === ''
            ? undefined
            : created,
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

/**
 * A New workspace page with the repositories and the composer of its org.
 * `shortcuts` holds the person's changes to the shortcuts, so the Search
 * row shows the person's key of the palette.
 */
export function NewWorkspaceScreen(props: {
  state: NewWorkspaceState
  viewport: Viewport
  shortcuts?: ShortcutChanges
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
    <AppFrame
      rail={railOf(state)}
      sidebar={sidebarOf(state, mac?.needsInput, props.shortcuts)}
    >
      {page}
    </AppFrame>
  )
}
