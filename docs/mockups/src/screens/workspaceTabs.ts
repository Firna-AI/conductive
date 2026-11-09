import { nameLabel } from '../../../../src/shared/name-label'
import type { WorkspaceTab } from '../components/workspace/WorkspaceTabs'
import {
  linkedSession,
  newSession,
  workspaceSessions,
} from '../fixtures/sessions'
import { splitPath } from '../fixtures/files'
import { maskedDiffPath } from '../fixtures/maskedFiles'
import type { Workspace } from '../fixtures/workspaces'
import { paths } from '../paths'
import type { WorkspaceState } from './workspaceState'

/** A workspace that the create flow made has no edits and one session. */
export function isNew(state: WorkspaceState): boolean {
  return state.workspace === 'saved-carts'
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
 * A tab whose file name the app does not know shows "File".
 * The one session of a new workspace takes the title of the workspace, so
 * its tab shows the same name as the header, Untitled before the title
 * comes. The linked session opens as the last tab. While the login of the
 * starter of the first session is not available, that first session leads
 * to its view for the member, beside the linked session. While the starter
 * keeps the login for their own messages, the first session leads to that
 * view.
 */
export function tabsFor(
  state: WorkspaceState,
  workspace: Workspace,
): WorkspaceTab[] {
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
      key: 'code',
      kind: 'code',
      title: 'useAddressAutocomplete.ts',
      to: paths.code,
      selected: state.tab === 'code',
    },
  ]
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
  return tabs
}
