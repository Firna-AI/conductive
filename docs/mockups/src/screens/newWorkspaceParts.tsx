import type { ReactNode } from 'react'
import { ConnectAgentNotice } from '../components/chat/ConnectAgentNotice'
import {
  CreateFailedNotice,
  type CreateFailure,
} from '../components/new-workspace/notices'
import {
  newWorkspaceAttachments,
  type Attachment,
} from '../fixtures/attachments'
import { savedCartsMessage } from '../fixtures/conversations'
import { savedCarts } from '../fixtures/workspaces'

/**
 * The state of the form of a new workspace that the New workspace page and
 * the New workspace dialog share, as properties of their schemas.
 */
export const newWorkspaceFormProperties = {
  /** The message: none yet, the task, or the task with an attached file. */
  draft: { enum: ['empty', 'message', 'file'] },
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

/** The values of the shared state, such as `draft: 'file'`. */
export type NewWorkspaceFormState = {
  [
    Key in FormProperty
  ]: (typeof newWorkspaceFormProperties)[Key]['enum'][number]
}

/** The text of an empty message, on the page and in the dialog. */
export const taskPlaceholder = 'Describe the task'

/** The text and the files of each draft. */
export const newWorkspaceDrafts: Readonly<
  Record<
    NewWorkspaceFormState['draft'],
    { text: string; attachments: readonly Attachment[] }
  >
> = {
  empty: { text: '', attachments: [] },
  message: { text: savedCartsMessage, attachments: [] },
  file: { text: savedCartsMessage, attachments: newWorkspaceAttachments },
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
  failure: CreateFailure | undefined,
): ReactNode[] {
  const notices: ReactNode[] = []
  if (failure) {
    notices.push(<CreateFailedNotice failure={failure} key="failed" />)
  }
  if (state.login === 'missing') {
    notices.push(<ConnectAgentNotice choice={newWorkspaceChoice} key="login" />)
  }
  return notices
}
