import type { SchemaProps, Viewport } from '@mokly/mokly'
import { ChatPane } from '../components/chat/ChatPane'
import { Menu } from '../components/common/Menu'
import { Sheet } from '../components/common/Sheet'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import { Page } from '../components/layout/Page'
import { useMacApp } from '../components/mac/MacApp'
import { BranchPicker } from '../components/new-workspace/BranchPicker'
import {
  branchLinks,
  type BranchLinks,
} from '../components/new-workspace/branchScreens'
import { formWait } from '../components/new-workspace/waitingRepository'
import { orgSuspendedReason } from '../components/orgs/suspension'
import { firstBuildStates } from '../fixtures/computer'
import { memberViewer, you } from '../fixtures/members'
import { paths } from '../paths'
import { FirstBuildNotice } from './firstBuildNotice'
import { pageOrg, railOf, sidebarOf } from './newWorkspacePageParts'
import {
  formNotices,
  matchesBaseForm,
  newWorkspaceDraft,
  newWorkspaceFormProperties,
  taskPlaceholder,
  waits,
} from './newWorkspaceParts'
import { repositoryMenu, waitingNotice } from './newWorkspaceRepositories'
import { Start } from './newWorkspaceStart'

export const newWorkspaceSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'draft',
    'files',
    'login',
    'repositories',
    'repositoryMenu',
    'waitingBuild',
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
  repositoryMenu: 'closed',
  waitingBuild: 'building',
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
 * Before the first good build, and while the repository of the form waits
 * for its build, the draft stays and Send is off.
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
  const waiting = formWait(page) !== undefined
  const failed = !suspended && state.result === 'error'
  const draft = newWorkspaceDraft(state)
  // Send leads to the create flow, which draws the task of Saved carts, so
  // the mockups draw no create flow for another draft.
  const linked = state.draft === 'workspace-link'
  const flow = sendFlow(state)
  const ownDraft = state.org === 'new' || waiting
  const text = ownDraft && state.draft !== 'empty' ? page.draft : draft.text
  const notices = formNotices(state, failed, !building && !waiting)
  const admin = state.viewer === 'admin'
  // The repositories of Firna never wait, so the notice of the first build
  // and the notice of a waiting repository never show together.
  if (state.org === 'new' && state.firstBuild !== 'succeeded') {
    notices.splice(
      failed ? 1 : 0,
      0,
      <FirstBuildNotice
        admin={admin}
        build={state.firstBuild}
        key="first-build"
      />,
    )
  }
  const repositoryWait = waitingNotice({
    form: page,
    wait: state.waitingBuild,
    admin,
  })
  if (repositoryWait) notices.splice(failed ? 1 : 0, 0, repositoryWait)
  const menuOpen = state.repositoryMenu === 'open'
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
        blocked: building || waiting || waits(state),
        choice: page.choice,
        draft: text,
        placeholder: taskPlaceholder,
        running: false,
        sendTo:
          failed || linked || waiting || state.org === 'new' || text === ''
            ? undefined
            : flow,
      }}
      empty={
        suspended ? undefined : (
          <Start
            admin={admin}
            chosen={state.repositories !== 'none'}
            links={props.links}
            menu={
              menuOpen && props.viewport === 'desktop'
                ? repositoryMenu(page, state.waitingBuild)
                : undefined
            }
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
      viewer={admin ? you : memberViewer}
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
    const sheet =
      state.repositoryMenu === 'open' &&
      state.repositories !== 'none' &&
      state.org !== 'suspended' ? (
        <Sheet title="Repository">
          <Menu
            entries={repositoryMenu(pageOrgData, state.waitingBuild)}
            label="Repository"
            placement="sheet"
          />
        </Sheet>
      ) : null
    return (
      <MobileFrame>
        {page}
        {sheet}
        {state.picker !== 'closed' && state.repositories !== 'none' ? (
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
