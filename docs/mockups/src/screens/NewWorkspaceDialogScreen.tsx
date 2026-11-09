import type { SchemaProps, Viewport } from '@mokly/mokly'
import { NewWorkspaceDialog } from '../components/new-workspace/NewWorkspaceDialog'
import { ChooseRepositoriesNotice } from '../components/new-workspace/notices'
import { orgs } from '../fixtures/orgs'
import { repositories } from '../fixtures/repositories'
import { defaultSection, sections } from '../fixtures/sections'
import { savedCarts } from '../fixtures/workspaces'
import { NewWorkspaceScreen } from './NewWorkspaceScreen'
import {
  formNotices,
  newWorkspaceChoice,
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
  required: ['draft', 'files', 'login', 'repositories', 'result'],
  properties: {
    ...newWorkspaceFormProperties,
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
  result: 'form',
}

const org = orgs.acme

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
  if (props.viewport === 'mobile') {
    return (
      <NewWorkspaceScreen
        state={{ ...state, org: 'active' }}
        viewport="mobile"
      />
    )
  }
  const chosen = state.repositories === 'chosen'
  const failed = state.result === 'error'
  const draft = newWorkspaceDraft(state)
  const notices = formNotices(state, failed)
  if (!chosen) {
    notices.push(
      <ChooseRepositoriesNotice admin key="repositories" org={org.name} />,
    )
  }
  const dialog = (
    <NewWorkspaceDialog
      attachments={draft.files}
      choice={newWorkspaceChoice}
      notices={notices}
      place={`${org.name} · ${sections[defaultSection].name}`}
      placeholder={taskPlaceholder}
      ready={draft.text !== '' && !waits(state)}
      repository={chosen ? repositories[savedCarts.repository].name : undefined}
      text={draft.text}
    />
  )
  return (
    <WorkspaceScreen
      overlay={dialog}
      state={readyWorkspace}
      viewport="desktop"
    />
  )
}
