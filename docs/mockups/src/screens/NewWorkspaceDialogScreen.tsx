import type { SchemaProps, Viewport } from '@mokly/mokly'
import { AppFrame } from '../components/layout/AppFrame'
import { NewWorkspaceDialog } from '../components/new-workspace/NewWorkspaceDialog'
import { ChooseRepositoriesNotice } from '../components/new-workspace/notices'
import { formWait } from '../components/new-workspace/waitingRepository'
import { newOrg } from '../fixtures/repositories'
import { defaultSection, sections } from '../fixtures/sections'
import {
  NewWorkspaceScreen,
  newWorkspaceForm,
  newWorkspaceSchema,
} from './NewWorkspaceScreen'
import { FirstBuildNotice } from './firstBuildNotice'
import { NewOrgEmpty } from './listParts'
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
import { WorkspaceScreen } from './WorkspaceScreen'
import { readyWorkspace } from './workspaceState'

export const newWorkspaceDialogSchema = {
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
  ],
  properties: {
    ...newWorkspaceFormProperties,
    org: { enum: ['active', 'new'] },
    firstBuild: newWorkspaceSchema.properties.firstBuild,
    viewer: newWorkspaceSchema.properties.viewer,
    /**
     * The form, or a create request that did not reach the server. The
     * dialog closes when the create succeeds, so the message of a failed
     * start stays in its workspace instead.
     */
    result: { enum: ['form', 'error'] },
  },
} as const

export type NewWorkspaceDialogState = SchemaProps<
  typeof newWorkspaceDialogSchema
>

/** The dialog as it opens: no message yet, in an org that is ready. */
export const emptyDialog: NewWorkspaceDialogState = {
  draft: 'empty',
  files: 'none',
  login: 'connected',
  repositories: 'chosen',
  repositoryMenu: 'closed',
  waitingBuild: 'building',
  result: 'form',
  org: 'active',
  firstBuild: 'succeeded',
  viewer: 'admin',
}

/**
 * New workspace as a dialog over the ready workspace, for a user who chose
 * the dialog in Preferences. New workspace at the top of the list puts the
 * workspace in General. A phone always opens the page, so its view is the
 * New workspace page in the same state.
 */
export function NewWorkspaceDialogScreen(props: {
  state: NewWorkspaceDialogState
  viewport: Viewport
}) {
  const { state } = props
  const pageState = { ...newWorkspaceForm, ...state }
  const page = pageOrg(pageState)
  const org = page.org
  const building = state.org === 'new' && state.firstBuild !== 'succeeded'
  if (props.viewport === 'mobile') {
    return <NewWorkspaceScreen state={pageState} viewport="mobile" />
  }
  const chosen = state.repositories !== 'none'
  const waiting = formWait(page) !== undefined
  const failed = state.result === 'error'
  const draft = newWorkspaceDraft(state)
  const notices = formNotices(state, failed, !building && !waiting)
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
  const repositoryWait = waitingNotice({
    form: page,
    wait: state.waitingBuild,
    admin: state.viewer === 'admin',
  })
  if (repositoryWait) notices.splice(failed ? 1 : 0, 0, repositoryWait)
  if (!chosen) {
    notices.push(
      <ChooseRepositoriesNotice
        admin={state.viewer === 'admin'}
        key="repositories"
        org={org.name}
      />,
    )
  }
  const ownDraft = (state.org === 'new' || waiting) && state.draft !== 'empty'
  const dialog = (
    <NewWorkspaceDialog
      attachments={draft.files}
      caret={ownDraft ? undefined : draft.caret}
      choice={page.choice}
      drop={state.files === 'drop-over'}
      notices={notices}
      place={`${org.name} · ${sections[defaultSection].name}`}
      placeholder={taskPlaceholder}
      ready={hasWords(draft.text) && !waits(state) && !building && !waiting}
      repository={chosen ? page.repository.name : undefined}
      repositoryMenu={
        chosen && state.repositoryMenu === 'open'
          ? repositoryMenu(page, state.waitingBuild)
          : undefined
      }
      text={ownDraft ? page.draft : draft.text}
    />
  )
  if (state.org === 'new') {
    return (
      <AppFrame
        overlay={dialog}
        rail={railOf(pageState)}
        sidebar={sidebarOf(pageState)}
      >
        <NewOrgEmpty org={newOrg} />
      </AppFrame>
    )
  }
  return (
    <WorkspaceScreen
      overlay={dialog}
      state={readyWorkspace}
      viewport="desktop"
    />
  )
}
