import type { ReactNode } from 'react'
import { connectAgentNotice } from '../entries/components/chat/ConnectAgentNotice.mockup'
import type { SessionLogin } from '../../../../src/ui/components/chat/SessionLogin'
import { fileMark, withoutMarks } from '../../../../src/app/draft-marks'
import { createFailedNotice } from '../entries/components/new-workspace/notices.mockup'
import { repositoryWaits } from '../../../../src/ui/components/settings/repositoryChangeCopy'
import {
  firstMessageBeforeDrop,
  firstMessageDraft,
  firstMessageDrafts,
  type Attachment,
} from '../fixtures/attachments'
import { orgWithLogin } from '../fixtures/orgLogins'
import { savedCartsMessage } from '../fixtures/newWorkspaceConversations'
import { followUpTask } from '../fixtures/workspaceLinkConversations'
import { savedCarts } from '../fixtures/workspaces'
import { plainData } from '../defined'

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
   * waits for its turn, or all uploaded. Each file is a chip at its place in
   * the text. The app stores each upload until the turn starts, so no cloud
   * computer is needed yet. Send and Create wait while a file uploads.
   * `drop-over` has the sketch over the message box before its drop, with
   * the drop caret in the text. The box shows the drop state on a
   * computer. A phone shows a pick at the caret in place of the drag.
   */
  files: { enum: ['none', 'uploading', 'ready', 'drop-over'] },
  /**
   * The agent of the chosen model: connected, or not connected. Then a
   * notice leads to its Connect form, and the message waits. `org` has the
   * org login of Acme as the default login of the viewer: the viewer has
   * no login of their own, or an admin turned on "Use for every member".
   * The message goes, and the bar names that login (decisions 4, 6 A, and
   * 7 B of the org logins plan).
   */
  login: { enum: ['connected', 'missing', 'org'] },
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
   * The branch that the new branch starts from (decision 298): the default
   * branch of the repository, which the branch control shows until the
   * member picks another, or a picked branch that is not the default.
   */
  branch: { enum: ['default', 'picked'] },
  /**
   * The target of a picked branch (decision 301): the picked branch, which
   * New workspace selects first (decision 305), or the default branch. The
   * Target part of the dropdown offers it only for a picked branch that is
   * not the default branch, and the closed control adds `→ main` while the
   * target is the default branch (decision 309).
   */
  target: { enum: ['picked', 'default'] },
  /**
   * The dropdown of the branch control, closed or drawn open: the
   * branches, a search that finds two, a search that finds none, the list
   * while it loads, a read of GitHub that failed, or a GitHub account that
   * cannot read the repository. A phone opens it as a sheet.
   */
  branchMenu: {
    enum: [
      'closed',
      'open',
      'search',
      'no-match',
      'loading',
      'failed',
      'no-access',
    ],
  },
  /**
   * The build that a waiting repository waits for: the newest build failed,
   * a build runs, or no build runs, such as after a start that failed.
   */
  waitingBuild: { enum: repositoryWaits },
  /**
   * The Capabilities control of the icon beside the attach button, closed
   * or drawn open (secrets decision 6). It holds the secrets that the new
   * workspace pre-approves. In the Mac app, it also holds the switch of Mac
   * access of this Mac, which is off in `open`. `mac-access-on` has the
   * switch on, so the create starts a grant until Stop on this Mac (Mac
   * access decision 7). A browser shows no Mac access part, so it draws
   * `mac-access-on` as `open`. `menu` opens the menu of the one button of a
   * phone, which holds Attach files and Capabilities (secrets decision
   * 16 G). A computer has no such menu. `search` draws the control open on
   * an org with more than ten secrets, with a search typed above them.
   * `info` draws it open with the description of PROD_DATABASE_URL shown
   * under its name.
   */
  capabilities: {
    enum: ['closed', 'open', 'mac-access-on', 'menu', 'search', 'info'],
  },
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
  'workspace-link': followUpTask,
}

/**
 * The text and the files of the message in a state. The files come from
 * the first message of the New workspace page, so the page and the dialog
 * draw the same chips. Each file is a chip at its place in the task. A
 * draft whose words do not name the files ends with their chips. While
 * the sketch hovers over the box, `caret` is the place of the drop caret:
 * after "as the sketch " in the task, or else at the end.
 */
export function newWorkspaceDraft(state: NewWorkspaceFormState): {
  text: string
  files: readonly Attachment[]
  caret?: number
} {
  const files = firstMessageDrafts[state.files]
  const words = draftTexts[state.draft]
  const over = state.files === 'drop-over'
  if (files.length === 0) return { text: words, files }
  if (state.draft === 'message') {
    if (!over) return { text: firstMessageDraft, files }
    const { draft, caret } = firstMessageBeforeDrop
    return { text: draft, files, caret }
  }
  const marks = files.map((file) => fileMark(file.id)).join(' ')
  const text = words === '' ? marks : `${words} ${marks}`
  return over ? { text, files, caret: text.length } : { text, files }
}

/**
 * The message has words outside the chips of its files. The first message
 * of a new workspace needs them, so Send and Create wait for them.
 */
export function hasWords(text: string): boolean {
  return withoutMarks(text).trim() !== ''
}

/** The model and the effort of the first message. */
export const newWorkspaceChoice = savedCarts.choice

/**
 * The login label of the form: the name of the org while the default login
 * of the viewer is the org login, such as "Acme's login". The account names
 * that default login, so the form shows it and does not work it out. The
 * own login of the viewer gets no label.
 */
export function formLoginLabel(
  state: NewWorkspaceFormState,
): SessionLogin | undefined {
  if (state.login !== 'org') return undefined
  return { owner: orgWithLogin.name }
}

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
    notices.push(
      <createFailedNotice.Component
        key="failed"
        moklyInstance="create-failed-notice"
        ready={ready}
      />,
    )
  }
  if (state.login === 'missing') {
    notices.push(
      <connectAgentNotice.Component
        choice={plainData(newWorkspaceChoice)}
        key="login"
        moklyInstance="connect-agent-notice"
      />,
    )
  }
  return notices
}
