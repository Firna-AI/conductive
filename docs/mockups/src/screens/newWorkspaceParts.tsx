import type { ReactNode } from 'react'
import { ConnectAgentNotice } from '../components/chat/ConnectAgentNotice'
import { CreateFailedNotice } from '../components/new-workspace/notices'
import { firstMessageDrafts, type Attachment } from '../fixtures/attachments'
import { savedCartsMessage } from '../fixtures/newWorkspaceConversations'
import { savedCarts } from '../fixtures/workspaces'

/**
 * The state of the form of a new workspace that the New workspace page and
 * the New workspace dialog share, as properties of their schemas.
 */
export const newWorkspaceFormProperties = {
  /** The text of the message: none yet, or the task. */
  draft: { enum: ['empty', 'message'] },
  /**
   * The files of the message: none, a file that uploads beside one that
   * waits for its turn, or all uploaded. The app stores each upload until
   * the turn starts, so no cloud computer is needed yet. Send and Create
   * wait while a file uploads.
   */
  files: { enum: ['none', 'uploading', 'ready'] },
  /**
   * The agent of the chosen model: connected, or not connected. Then a
   * notice leads to its Connect form, and the message waits.
   */
  login: { enum: ['connected', 'missing'] },
  /**
   * The repositories of the org: chosen, or none yet. Then the form asks an
   * admin to choose them first, and the message waits.
   */
  repositories: { enum: ['chosen', 'none'] },
} as const

type FormProperty = keyof typeof newWorkspaceFormProperties

/** The values of the shared state, such as `files: 'ready'`. */
export type NewWorkspaceFormState = {
  [
    Key in FormProperty
  ]: (typeof newWorkspaceFormProperties)[Key]['enum'][number]
}

/** The text of an empty message, on the page and in the dialog. */
export const taskPlaceholder = 'Describe the task'

/** The text of each draft. */
const draftTexts: Readonly<Record<NewWorkspaceFormState['draft'], string>> = {
  empty: '',
  message: savedCartsMessage,
}

/**
 * The text and the files of the message in a state. The files come from
 * the first message of the New workspace page, so the page and the dialog
 * draw the same chips.
 */
export function newWorkspaceDraft(state: NewWorkspaceFormState): {
  text: string
  files: readonly Attachment[]
} {
  return {
    text: draftTexts[state.draft],
    files: firstMessageDrafts[state.files],
  }
}

/** The model and the effort of the first message. */
export const newWorkspaceChoice = savedCarts.choice

/**
 * Whether the message waits: its agent is not connected, or the org has no
 * repository to start in. Send and Create are then off.
 */
export function waits(state: NewWorkspaceFormState): boolean {
  return state.login === 'missing' || state.repositories === 'none'
}

/**
 * The notices of a new workspace that the page and the dialog share: a
 * failed create, then a missing agent login.
 */
export function formNotices(
  state: NewWorkspaceFormState,
  failed: boolean,
  ready = true,
): ReactNode[] {
  const notices: ReactNode[] = []
  if (failed) {
    notices.push(<CreateFailedNotice key="failed" ready={ready} />)
  }
  if (state.login === 'missing') {
    notices.push(<ConnectAgentNotice choice={newWorkspaceChoice} key="login" />)
  }
  return notices
}
