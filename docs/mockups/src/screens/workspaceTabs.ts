import { nameLabel } from '../../../../src/shared/name-label'
import type { MenuEntry } from '../components/common/Menu'
import type { WorkspaceTab } from '../components/workspace/TabItem'
import { historyEntries } from '../components/workspace/WorkspaceTabs'
import {
  linkedSession,
  newSession,
  workspaceSessions,
} from '../fixtures/sessions'
import { screenshotCopy } from '../fixtures/attachments'
import { branchPictures, splitPath } from '../fixtures/files'
import { maskedDiffPath } from '../fixtures/maskedFiles'
import type { Workspace } from '../fixtures/workspaces'
import { paths } from '../paths'
import type { WorkspaceState } from './workspaceState'
import { codeTabKey, moreTabs, withCodeMoved } from './workspaceTabRow'
import { withTemporaryTab } from './workspaceTemporaryTab'

/**
 * A workspace that the create flow or a routine run made has one session,
 * and no edits of its own.
 */
export function isNew(state: WorkspaceState): boolean {
  return state.workspace === 'saved-carts' || state.run !== undefined
}

/**
 * The states after the second session sent a message to the first session
 * and to Saved carts. Each session tab then leads to the chat of its session
 * at that time.
 */
function sessionLinkStates(state: WorkspaceState): boolean {
  return (
    state.tab === 'later-session' ||
    state.conversation === 'sent-by' ||
    state.composer === 'session-link'
  )
}

/** The history of the workspace, with a note while a new workspace has none. */
export function historyFor(state: WorkspaceState): readonly MenuEntry[] {
  return isNew(state)
    ? [{ kind: 'note', text: 'Sessions that you close show here.' }]
    : historyEntries
}

/**
 * The name that the screen shows for the workspace. A new workspace has no
 * name from the send until its title comes, about a second later, while
 * the sandbox starts, so it shows Untitled. After a failed title request
 * it stays Untitled until a later message with text gets a title.
 */
export function workspaceName(
  state: WorkspaceState,
  workspace: Workspace,
): string {
  const untitled = state.name === 'untitled' && isNew(state)
  return nameLabel(untitled ? null : workspace.name)
}

/**
 * The tab of an image file that the state opens: a picture of the branch,
 * an image whose bytes the browser cannot draw, or the copy of an attached
 * screenshot. A picture takes the icon that All files gives each other
 * file. A read of the copy names it by its file name, because no list
 * names it.
 */
function pictureTab(state: WorkspaceState): WorkspaceTab | undefined {
  const tab = (key: string, path: string, to: string): WorkspaceTab => ({
    key,
    kind: 'file',
    title: splitPath(path).name,
    to,
    selected: true,
  })
  switch (state.tab) {
    case 'image':
      return tab('image', branchPictures.picture, paths.image)
    case 'image-not-drawn':
      return tab('image', branchPictures.damaged, paths.imageNotDrawn)
    case 'attachment':
      return tab('copy', screenshotCopy.path, paths.attachmentOpen)
    default:
      return undefined
  }
}

/**
 * The tabs of the centre column: the sessions, the code file that stays
 * open, and the file, the diff, or the new session that the state opens.
 * Each new tab opens at the end of the row, as the linked session does. A
 * full row holds more sessions and files before the tab that the state
 * opens, and a move puts the code file between the two sessions. A tab
 * whose file name the app does not know shows "File". The one session of a
 * new workspace takes the title of the workspace, so its tab shows the same
 * name as the header, Untitled before the title comes. While the login of
 * the starter of the first session is not available, that first session
 * leads to its view for the member, beside the linked session. While the
 * starter keeps the login for their own messages, the first session leads
 * to that view. After the second session sent its messages, the second
 * session can show, and each session tab leads to its chat of that time.
 * The file or the diff that the state opens can be the temporary tab, as
 * `withTemporaryTab` draws it.
 */
export function tabsFor(
  state: WorkspaceState,
  workspace: Workspace,
  running = false,
): WorkspaceTab[] {
  if (isNew(state)) {
    const title = workspaceName(state, workspace)
    return [{ key: 'session', kind: 'session', title, selected: true, running }]
  }
  const [first, second] = workspaceSessions
  const linked =
    state.tab === 'linked-session' || state.composer === 'no-starter-login'
  const sent = sessionLinkStates(state)
  let firstPath: string = linked ? paths.noStarterLogin : paths.app
  if (state.composer === 'not-shared') firstPath = paths.loginNotShared
  if (sent) firstPath = paths.sentBy
  const tabs: WorkspaceTab[] = [
    {
      key: first.key,
      kind: 'session',
      title: nameLabel(first.title),
      to: firstPath,
      selected: state.tab === 'session',
    },
    {
      key: second.key,
      kind: 'session',
      title: nameLabel(second.title),
      to: sent ? paths.sessionChips : undefined,
      selected: state.tab === 'later-session',
    },
    {
      key: codeTabKey,
      kind: 'code',
      title: 'useAddressAutocomplete.ts',
      to: paths.code,
      selected: state.tab === 'code',
    },
  ]
  if (state.tabRow === 'full') tabs.push(...moreTabs)
  if (state.tab === 'markdown') {
    const to = paths.markdown
    tabs.push({
      key: 'readme',
      kind: 'markdown',
      title: 'README.md',
      to,
      selected: true,
    })
  }
  if (state.tab === 'diff') {
    const masked = state.paths === 'masked'
    tabs.push({
      key: 'diff',
      kind: 'diff',
      title: masked ? splitPath(maskedDiffPath).name : 'AddressForm.tsx',
      to: masked ? paths.maskedPaths : paths.diff,
      selected: true,
    })
  }
  const picture = pictureTab(state)
  if (picture) tabs.push(picture)
  if (state.tab === 'unnamed-file') {
    tabs.push({
      key: 'unnamed',
      kind: 'code',
      title: 'File',
      to: paths.maskedPathsUnnamed,
      selected: true,
    })
  }
  if (state.tab === 'new-session') {
    const { key, title } = newSession
    tabs.push({
      key,
      kind: 'session',
      title: nameLabel(title),
      to: paths.sessions,
      selected: true,
    })
  }
  if (state.tab === 'linked-session') {
    const { key, title } = linkedSession
    tabs.push({
      key,
      kind: 'session',
      title: nameLabel(title),
      to: paths.linkedSession,
      selected: true,
    })
  }
  const background = state.conversation === 'session-links'
  const active =
    (background ? tabs[0] : undefined) ??
    tabs.find(
      (tab) =>
        tab.kind === 'session' && tab.selected && tab.key !== newSession.key,
    ) ??
    tabs[0]
  const states = tabs.map((tab) => ({
    ...tab,
    running: tab === active && (running || background),
  }))
  return withTemporaryTab(
    state,
    state.tabRow === 'moved' ? withCodeMoved(states) : states,
  )
}
