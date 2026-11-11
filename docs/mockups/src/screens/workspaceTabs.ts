import { nameLabel } from '../../../../src/shared/name-label'
import type { MenuEntry } from '../components/common/Menu'
import { oldSessionHistory } from '../components/conductor-import/ImportedParts'
import type { WorkspaceTab } from '../components/workspace/TabItem'
import { historyEntries } from '../components/workspace/WorkspaceTabs'
import {
  linkedSession,
  newSession,
  workspaceSessions,
} from '../fixtures/sessions'
import { oldSessions } from '../fixtures/conductorImport'
import { splitPath } from '../fixtures/files'
import { maskedDiffPath } from '../fixtures/maskedFiles'
import type { Workspace } from '../fixtures/workspaces'
import { paths } from '../paths'
import { importedTabs } from './importedSessions'
import { isImported, oldSessionLinks } from './importedWorkspace'
import type { WorkspaceState } from './workspaceState'
import { codeTabKey, moreTabs, withCodeMoved } from './workspaceTabRow'

/**
 * The workspaces that the create flow made: Saved carts on a new branch,
 * and the same task on the chosen branch.
 */
const newWorkspaces: ReadonlySet<WorkspaceState['workspace']> = new Set([
  'saved-carts',
  'saved-carts-branch',
])

/**
 * A workspace that the create flow or a routine run made has one session,
 * and no edits of its own.
 */
export function isNew(state: WorkspaceState): boolean {
  return newWorkspaces.has(state.workspace) || state.run !== undefined
}

/**
 * The history of the workspace, with a note while a new workspace has none.
 * An imported workspace lists its old sessions from Conductor.
 */
export function historyFor(state: WorkspaceState): readonly MenuEntry[] {
  if (isImported(state)) {
    return oldSessionHistory(oldSessions, oldSessionLinks(state))
  }
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
 * to that view.
 */
export function tabsFor(
  state: WorkspaceState,
  workspace: Workspace,
): WorkspaceTab[] {
  if (isImported(state)) return importedTabs(state)
  if (isNew(state)) {
    const title = workspaceName(state, workspace)
    return [{ key: 'session', kind: 'session', title, selected: true }]
  }
  const [first, second] = workspaceSessions
  const linked =
    state.tab === 'linked-session' || state.composer === 'no-starter-login'
  let firstPath: string = linked ? paths.noStarterLogin : paths.app
  if (state.composer === 'not-shared') firstPath = paths.loginNotShared
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
      selected: false,
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
  return state.tabRow === 'moved' ? withCodeMoved(tabs) : tabs
}
