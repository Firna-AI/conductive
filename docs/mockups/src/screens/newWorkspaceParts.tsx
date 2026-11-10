import type { ReactNode } from 'react'
import { ConnectAgentNotice } from '../components/chat/ConnectAgentNotice'
import { CreateFailedNotice } from '../components/new-workspace/notices'
import { repositoryWaits } from '../components/settings/repositoryChangeCopy'
import { firstMessageDrafts, type Attachment } from '../fixtures/attachments'
import { savedCartsMessage } from '../fixtures/newWorkspaceConversations'
import { followUpTask } from '../fixtures/workspaceLinkConversations'
import { savedCarts } from '../fixtures/workspaces'

/**
 * The state of the form of a new workspace that the New workspace page and
 * the New workspace dialog share, as properties of their schemas.
 */
export const newWorkspaceFormProperties = {
  /**
   * The text of the message: none yet, the task, or a task with a pasted
   * link to an earlier workspace, which shows as a chip.
   */
  draft: { enum: ['empty', 'message', 'workspace-link'] },
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
   * The repositories of the org. `chosen` has the three that the cloud
   * computer of Acme holds. `waiting` adds acme/admin-dashboard, which waits
   * for its build, and the form holds the first ready repository.
   * `draft-waits` is the same with a kept draft in acme/admin-dashboard.
   * `none-ready` has acme/admin-dashboard alone, so no chosen repository is
   * ready. A form whose repository waits keeps Send off. `none` has no
   * repository chosen yet: the form asks an admin to choose them first, and
   * the message waits. A repository waits only once the org has a cloud
   * computer, so Firna before its first build shows its first build instead.
   */
  repositories: {
    enum: ['chosen', 'waiting', 'draft-waits', 'none-ready', 'none'],
  },
  /** The repository menu, closed or drawn open. */
  repositoryMenu: { enum: ['closed', 'open'] },
  /**
   * The build that a waiting repository waits for: the newest build failed,
   * a build runs, or no build runs, such as after a start that failed.
   */
  waitingBuild: { enum: repositoryWaits },
  /**
   * The branch of the new workspace: a new branch, as by default, an
   * existing branch, or the branch of an open pull request.
   */
  branch: { enum: ['new', 'existing', 'pull-request'] },
  /**
   * The branch picker: closed, open, open with a search that finds a pull
   * request, finds nothing, or finds the pull request from a fork, or open
   * while its list loads or after the list did not load. A phone opens it
   * in a sheet.
   */
  picker: {
    enum: ['closed', 'open', 'search', 'no-match', 'fork', 'loading', 'failed'],
  },
} as const

type FormProperty = keyof typeof newWorkspaceFormProperties

/** The values of the shared state, such as `files: 'ready'`. */
export type NewWorkspaceFormState = {
  [
    Key in FormProperty
  ]: (typeof newWorkspaceFormProperties)[Key]['enum'][number]
}

/**
 * Whether a form state matches the base example of its form in every field
 * apart from the branch and the picker. `fields` is the list of every field
 * from the schema of the form, so a field that a schema adds takes part
 * too.
 */
export function matchesBaseForm<S extends NewWorkspaceFormState>(
  fields: readonly (keyof S)[],
  state: S,
  base: S,
): boolean {
  return fields.every(
    (field) =>
      field === 'branch' || field === 'picker' || state[field] === base[field],
  )
}

/** The text of an empty message, on the page and in the dialog. */
export const taskPlaceholder = 'Describe the task'

/** The text of each draft. */
const draftTexts: Readonly<Record<NewWorkspaceFormState['draft'], string>> = {
  empty: '',
  message: savedCartsMessage,
  'workspace-link': followUpTask,
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
