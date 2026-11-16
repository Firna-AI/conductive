import type { SchemaProps, Viewport } from '@mokly/mokly'
import { chatPane } from '../entries/components/chat/ChatPane.mockup'
import { menu } from '../entries/components/common/Menu.mockup'
import { sheet as sheetPart } from '../entries/components/common/Sheet.mockup'
import {
  appFrame,
  mobileFrame,
} from '../entries/components/layout/AppFrame.mockup'
import { page as pagePart } from '../entries/components/layout/Page.mockup'
import { useMacApp } from '../components/mac/MacApp'
import { formWait } from '../components/new-workspace/waitingRepository'
import { orgSuspendedReason } from '../components/orgs/suspension'
import { firstBuildStates } from '../fixtures/computer'
import { memberViewer, you } from '../fixtures/members'
import type { ShortcutChanges } from '../fixtures/shortcutChanges'
import { paths } from '../paths'
import { firstBuildNotice } from '../entries/components/screens/firstBuildNotice.mockup'
import { pageOrg, railOf, sidebarOf } from './newWorkspacePageParts'
import {
  formNotices,
  hasWords,
  newWorkspaceDraft,
  newWorkspaceFormProperties,
  taskPlaceholder,
  waits,
} from './newWorkspaceParts'
import { repositoryMenu, waitingNotice } from './newWorkspaceRepositories'
import { newWorkspaceStart } from '../entries/components/screens/newWorkspaceStart.mockup'
import { defined, plainData } from '../defined'

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
    'result',
    'org',
    'firstBuild',
    'viewer',
    'modelMenu',
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
    /** The menu of the model picker: closed, or open with fast mode on. */
    modelMenu: { enum: ['closed', 'open-fast'] },
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
  result: 'form',
  org: 'active',
  firstBuild: 'succeeded',
  viewer: 'admin',
  modelMenu: 'closed',
}

/**
 * The empty chat and its composer. The files of the first message upload
 * before the workspace exists, and Send waits for them. A failed create
 * keeps the message for Try again. A suspended org shows the refused bar.
 * Before the first good build, and while the repository of the form waits
 * for its build, the draft stays and Send is off.
 */
function NewChat(props: { state: NewWorkspaceState; viewport: Viewport }) {
  const { state } = props
  const page = pageOrg(state)
  const suspended = state.org === 'suspended'
  const building = state.org === 'new' && state.firstBuild !== 'succeeded'
  const waiting = formWait(page) !== undefined
  const failed = !suspended && state.result === 'error'
  const draft = newWorkspaceDraft(state)
  // Send leads to the create flow, which draws the task of Saved carts.
  const linked = state.draft === 'workspace-link'
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
      <firstBuildNotice.Component
        admin={admin}
        build={state.firstBuild}
        key="first-build"
        moklyInstance="first-build-notice"
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
  // The file screens draw the Saved carts task of Acme, so the attach button
  // of Firna and of a linked task leads nowhere.
  const created =
    state.files === 'ready' ? paths.attachmentsQueued : paths.creating
  const fastMenu = state.modelMenu === 'open-fast'
  return (
    <chatPane.Component
      composer={plainData({
        attachments: draft.files,
        attachTo:
          state.files === 'none' && !failed && !linked && state.org !== 'new'
            ? paths.newWorkspaceFiles
            : undefined,
        blocked: building || waiting || waits(state),
        caret: text === draft.text ? draft.caret : undefined,
        choice: fastMenu ? { ...page.choice, fast: true } : page.choice,
        draft: text,
        // A phone shows a pick at the caret in place of the drag.
        drop: state.files === 'drop-over' && props.viewport === 'desktop',
        picker: fastMenu,
        placeholder: taskPlaceholder,
        running: false,
        sendTo:
          failed || linked || waiting || state.org === 'new' || !hasWords(text)
            ? undefined
            : created,
      })}
      items={[]}
      moklyInstance="chat"
      viewer={admin ? you : memberViewer}
      viewport={props.viewport}
      {...defined({
        empty: suspended ? undefined : (
          <newWorkspaceStart.Component
            admin={admin}
            chosen={state.repositories !== 'none'}
            moklyInstance="start"
            page={plainData(page)}
            {...defined({
              menu:
                menuOpen && props.viewport === 'desktop'
                  ? repositoryMenu(page, state.waitingBuild)
                  : undefined,
            })}
          />
        ),
        notice: suspended ? undefined : notices,
        problem: suspended
          ? { problem: 'refused', reason: orgSuspendedReason }
          : undefined,
      })}
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
    <pagePart.Component
      fill
      {...defined({
        back: mobile
          ? { label: 'Workspaces', to: pageOrgData.list }
          : undefined,
      })}
      subtitle={pageOrgData.org.name}
      title="New workspace"
      viewport={props.viewport}
    >
      <NewChat state={state} viewport={props.viewport} />
    </pagePart.Component>
  )
  if (mobile) {
    const sheet =
      state.repositoryMenu === 'open' &&
      state.repositories !== 'none' &&
      state.org !== 'suspended' ? (
        <sheetPart.Component
          moklyInstance="repository-sheet"
          title="Repository"
        >
          <menu.Component
            entries={repositoryMenu(pageOrgData, state.waitingBuild)}
            label="Repository"
            moklyInstance="repository-menu"
            placement="sheet"
          />
        </sheetPart.Component>
      ) : null
    return (
      <mobileFrame.Component>
        {page}
        {sheet}
      </mobileFrame.Component>
    )
  }
  return (
    <appFrame.Component
      rail={railOf(state)}
      sidebar={sidebarOf(state, mac?.needsInput, props.shortcuts)}
    >
      {page}
    </appFrame.Component>
  )
}
