import type { SchemaProps, Viewport } from '@mokly/mokly'
import { AppFrame } from '../components/layout/AppFrame'
import { branchLinks } from '../components/new-workspace/branchScreens'
import { NewWorkspaceDialog } from '../components/new-workspace/NewWorkspaceDialog'
import { ChooseRepositoriesNotice } from '../components/new-workspace/notices'
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
  matchesBaseForm,
  newWorkspaceDraft,
  newWorkspaceFormProperties,
  taskPlaceholder,
  waits,
} from './newWorkspaceParts'
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
    'branch',
    'picker',
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
  branch: 'new',
  picker: 'closed',
  result: 'form',
  org: 'active',
  firstBuild: 'succeeded',
  viewer: 'admin',
}

/**
 * New workspace as a dialog over the ready workspace, for a user who chose
 * the dialog in Preferences. New workspace at the top of the list puts the
 * workspace in General. A phone always opens the page, so its view is the
 * New workspace page in the same state. Its branch links stay those of the
 * dialog, from the full state of the dialog, so they keep its draft.
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
  const matches = matchesBaseForm(
    newWorkspaceDialogSchema.required,
    state,
    emptyDialog,
  )
  const links = branchLinks('dialog', state.branch, matches)
  if (props.viewport === 'mobile') {
    return (
      <NewWorkspaceScreen
        branchLinks={links}
        state={pageState}
        viewport="mobile"
      />
    )
  }
  const chosen = state.repositories === 'chosen'
  const failed = state.result === 'error'
  const draft = newWorkspaceDraft(state)
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
  if (!chosen) {
    notices.push(
      <ChooseRepositoriesNotice
        admin={state.viewer === 'admin'}
        key="repositories"
        org={org.name}
      />,
    )
  }
  const dialog = (
    <NewWorkspaceDialog
      attachments={draft.files}
      branch={{ choice: state.branch, picker: state.picker, links }}
      choice={page.choice}
      notices={notices}
      place={`${org.name} · ${sections[defaultSection].name}`}
      placeholder={taskPlaceholder}
      ready={draft.text !== '' && !waits(state) && !building}
      repository={chosen ? page.repository : undefined}
      text={
        state.org === 'new' && state.draft !== 'empty' ? page.draft : draft.text
      }
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
