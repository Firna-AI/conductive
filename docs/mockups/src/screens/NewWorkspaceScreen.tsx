import type { SchemaProps, Viewport } from '@mokly/mokly'
import { ChatPane } from '../components/chat/ChatPane'
import { Sheet } from '../components/common/Sheet'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import { Page } from '../components/layout/Page'
import { useMacApp } from '../components/mac/MacApp'
import { BranchPicker } from '../components/new-workspace/BranchPicker'
import {
  branchLinks,
  type BranchLinks,
} from '../components/new-workspace/branchScreens'
import { orgSuspendedReason } from '../components/orgs/suspension'
import { firstBuildStates } from '../fixtures/computer'
import { memberViewer, you } from '../fixtures/members'
import { paths } from '../paths'
import { FirstBuildNotice } from './firstBuildNotice'
import { pageOrg, railOf, sidebarOf, Start } from './newWorkspacePageParts'
import {
  formNotices,
  matchesBaseForm,
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
    'branch',
    'picker',
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
  branch: 'new',
  picker: 'closed',
  result: 'form',
  org: 'active',
  firstBuild: 'succeeded',
  viewer: 'admin',
}

/** The screen that Send opens for each branch choice, where one is drawn. */
const createFlows: Readonly<
  Record<NewWorkspaceState['branch'], string | undefined>
> = {
  new: paths.creating,
  existing: paths.newWorkspaceBranchStart,
  'pull-request': undefined,
}

/**
 * The screen that Send opens, where one is drawn: the create flow of the
 * task of Saved carts on a new branch, the screen of its queued files, or
 * its start on the chosen branch. The file screens draw a new branch, so a
 * chosen branch with files has no screen. Neither has a chosen pull
 * request, whose branch starts in the same way.
 */
function sendFlow(state: NewWorkspaceState): string | undefined {
  if (state.files === 'ready') {
    return state.branch === 'new' ? paths.attachmentsQueued : undefined
  }
  return createFlows[state.branch]
}

/**
 * The empty chat and its composer. The files of the first message upload
 * before the workspace exists, and Send waits for them. A failed create
 * keeps the message for Try again. A suspended org shows the refused bar.
 * Before the first good build, the draft stays and Send is off.
 */
function NewChat(props: {
  state: NewWorkspaceState
  viewport: Viewport
  links: BranchLinks
}) {
  const { state } = props
  const page = pageOrg(state)
  const suspended = state.org === 'suspended'
  const building = state.org === 'new' && state.firstBuild !== 'succeeded'
  const failed = !suspended && state.result === 'error'
  const draft = newWorkspaceDraft(state)
  // Send leads to the create flow, which draws the task of Saved carts, so
  // the mockups draw no create flow for another draft.
  const linked = state.draft === 'workspace-link'
  const flow = sendFlow(state)
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
  // The file screens draw the Saved carts task of Acme on a new branch, so
  // the attach button of Firna, of a linked task, and of a chosen branch
  // leads nowhere.
  const attachable =
    state.files === 'none' &&
    state.branch === 'new' &&
    !failed &&
    !linked &&
    state.org !== 'new'
  return (
    <ChatPane
      composer={{
        attachments: draft.files,
        attachTo: attachable ? paths.newWorkspaceFiles : undefined,
        blocked: building || waits(state),
        choice: page.choice,
        draft: text,
        placeholder: taskPlaceholder,
        running: false,
        sendTo:
          failed || linked || state.org === 'new' || text === ''
            ? undefined
            : flow,
      }}
      empty={
        suspended ? undefined : (
          <Start
            admin={state.viewer === 'admin'}
            chosen={state.repositories === 'chosen'}
            links={props.links}
            page={page}
            phone={props.viewport === 'mobile'}
            state={state}
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
 * The branch links of the page, from its full state: live only while the
 * state matches the base example of the page apart from the branch and
 * the picker.
 */
function pageBranchLinks(state: NewWorkspaceState): BranchLinks {
  const matches = matchesBaseForm(
    newWorkspaceSchema.required,
    state,
    newWorkspaceForm,
  )
  return branchLinks('page', state.branch, matches)
}

/**
 * A New workspace page with the repositories and the composer of its org.
 * `branchLinks` are the branch links of the form that the page draws: the
 * phone view of the dialog passes the links of the dialog, from the full
 * state of the dialog. Otherwise the page derives its own links.
 */
export function NewWorkspaceScreen(props: {
  state: NewWorkspaceState
  viewport: Viewport
  branchLinks?: BranchLinks
}) {
  const mac = useMacApp()
  const { state } = props
  const links = props.branchLinks ?? pageBranchLinks(state)
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
      <NewChat links={links} state={state} viewport={props.viewport} />
    </Page>
  )
  if (mobile) {
    return (
      <MobileFrame>
        {page}
        {state.picker !== 'closed' && state.repositories === 'chosen' ? (
          <Sheet title="Branch">
            <BranchPicker
              choice={state.branch}
              links={links}
              placement="sheet"
              state={state.picker}
            />
          </Sheet>
        ) : null}
      </MobileFrame>
    )
  }
  return (
    <AppFrame rail={railOf(state)} sidebar={sidebarOf(state, mac?.needsInput)}>
      {page}
    </AppFrame>
  )
}
