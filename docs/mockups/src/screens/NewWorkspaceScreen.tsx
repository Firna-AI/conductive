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
 * The empty chat and its composer. A failed create keeps the message for
 * Try again. A suspended org shows the refused bar. Before the first good
 * build, the draft stays and Send is off.
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
  const draft = newWorkspaceDrafts[state.draft]
  // Send leads to the create flow, which draws the task of Saved carts on
  // a new branch, or to its start on the chosen branch. The mockups draw no
  // create flow for another draft, or for a chosen pull request, whose
  // branch starts in the same way.
  const flow = createFlows[state.branch]
  const otherFlow = state.draft === 'workspace-link' || flow === undefined
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
          failed || otherFlow || state.org === 'new' || text === ''
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
