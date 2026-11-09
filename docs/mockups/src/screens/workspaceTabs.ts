import type { WorkspaceTab } from '../components/workspace/TabItem'
import {
  linkedSession,
  newSession,
  workspaceSessions,
} from '../fixtures/sessions'
import type { Workspace } from '../fixtures/workspaces'
import { paths } from '../paths'
import type { WorkspaceState } from './workspaceState'
import { codeTabKey, moreTabs, withCodeMoved } from './workspaceTabRow'

/** A workspace that the create flow made has no edits and one session. */
export function isNew(state: WorkspaceState): boolean {
  return state.workspace === 'saved-carts'
}

/**
 * The name of the workspace: the city that the app gave it, until the
 * agent's first answer names it after the task.
 */
export function workspaceName(
  state: WorkspaceState,
  workspace: Workspace,
): string {
  const waiting = state.conversation === 'queued'
  return waiting && workspace.generatedName
    ? workspace.generatedName
    : workspace.name
}

/**
 * The tabs of the centre column: the sessions, the code file that stays
 * open, and the file, the diff, or the new session that the state opens.
 * Each new tab opens at the end of the row, as the linked session does. A
 * full row holds more sessions and files before the tab that the state
 * opens, and a move puts the code file between the two sessions. While the
 * login of the starter of the first session is not available, that first
 * session leads to its view for the member, beside the linked session.
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
  const tabs: WorkspaceTab[] = [
    {
      key: first.key,
      kind: 'session',
      title: first.title,
      to: linked ? paths.noStarterLogin : paths.app,
      selected: state.tab === 'session',
    },
    { key: second.key, kind: 'session', title: second.title, selected: false },
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
    const to = paths.diff
    tabs.push({
      key: 'diff',
      kind: 'diff',
      title: 'AddressForm.tsx',
      to,
      selected: true,
    })
  }
  if (state.tab === 'new-session') {
    const { key, title } = newSession
    tabs.push({
      key,
      kind: 'session',
      title,
      to: paths.sessions,
      selected: true,
    })
  }
  if (state.tab === 'linked-session') {
    const { key, title } = linkedSession
    tabs.push({
      key,
      kind: 'session',
      title,
      to: paths.linkedSession,
      selected: true,
    })
  }
  return state.tabRow === 'moved' ? withCodeMoved(tabs) : tabs
}
