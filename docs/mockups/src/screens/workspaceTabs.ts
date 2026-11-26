import { nameLabel } from '../../../../src/shared/name-label'
import type { MenuEntryData } from '../entries/components/common/menuEntries'
import type { WorkspaceTab } from '../components/workspace/TabItem'
import { historyEntries } from '../components/workspace/WorkspaceTabs'
import {
  linkedSession,
  newSession,
  startedSession,
  workspaceSessions,
} from '../fixtures/sessions'
import { splitPath } from '../fixtures/files'
import { maskedDiffPath } from '../fixtures/maskedFiles'
import type { Workspace } from '../fixtures/workspaces'
import { paths } from '../paths'
import { explainTabs } from './explainModel'
import { tabLinks } from './walkLinks'
import type { WalkView } from './walks'
import { htmlTab, pictureTab, previewTabs } from './workspaceFileTab'
import { chatWaits, tabNeedsInput } from './workspaceRequests'
import { skillTab } from './workspaceSkillTab'
import type { WorkspaceState } from './workspaceState'
import { codeTabKey, moreTabs, withCodeMoved } from './workspaceTabRow'
import {
  readmeBesideKeptSkill,
  withTemporaryTab,
} from './workspaceTemporaryTab'

/**
 * A workspace that the create flow or an automation run made has one session,
 * and no edits of its own.
 */
export function isNew(state: WorkspaceState): boolean {
  return state.workspace === 'saved-carts' || state.run !== undefined
}

/**
 * A workspace with one session, whose tab takes the title of the
 * workspace: a new one, and the removed Postcode lookup for the shipping
 * and billing forms, which kept the one session that made it.
 */
function oneSession(state: WorkspaceState): boolean {
  return isNew(state) || state.workspace === 'postcode-lookup'
}

/**
 * The states after the second session sent a message to the first session
 * and to Saved carts. Each session tab then leads to the chat of its session
 * at that time. The second session shows at another time too, while the
 * first session holds a request.
 */
function sessionLinkStates(state: WorkspaceState): boolean {
  return (
    (state.tab === 'later-session' && state.otherRequest === 'none') ||
    state.conversation === 'sent-by' ||
    state.composer === 'session-link'
  )
}

/**
 * Whether the open session has no message yet: a new session of the viewer,
 * or an empty session that another member started. Its chat shows the
 * empty state of a new session.
 */
export function noMessages(state: WorkspaceState): boolean {
  return state.tab === 'new-session' || state.tab === 'started-session'
}

/** The history of the workspace, with a note while a new workspace has none. */
export function historyFor(state: WorkspaceState): readonly MenuEntryData[] {
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
 * open, and the file, diff, skill, or new session that the state opens.
 * Each new tab opens at the end of the row, as the linked session does. A
 * full row holds more sessions and files before the tab that the state
 * opens, and a move puts the code file between the two sessions. A tab
 * whose file name the app does not know shows "File". The one session of a
 * new workspace takes the title of the workspace, so its tab shows the same
 * name as the header, Untitled before the title comes, as `oneSession`
 * says. While the login of the starter of the first session is not
 * available, that first session leads to its view for the member, beside
 * the linked session. While the starter keeps the login for their own
 * messages, or after an admin removed the org login of the session, the
 * first session leads to that view. After the second session sent its
 * messages, the second session can show, and each session tab leads to its
 * chat of that time. The file, the diff, or the skill that the state opens
 * can be the temporary tab, as `withTemporaryTab` draws it. The tab of
 * README.md after the kept skill tab of `plans` leads to the screen of
 * that row, as `readmeBesideKeptSkill` says. The Preview tabs show after
 * the code file. The tabs of the open explanations come last, as
 * `explainTabs` says. A session tab shows the needs-input mark while it
 * holds an open request. While the tab of an explanation shows, its chat
 * is the open chat, so no tab of the other sessions takes its request or
 * its spinner. Last, `tabLinks` gives each tab the page of the walk of the
 * screen in `view`, so a tab keeps the open requests.
 */
export function tabsFor(
  state: WorkspaceState,
  workspace: Workspace,
  running = false,
  view: WalkView = 'browser',
): WorkspaceTab[] {
  if (oneSession(state)) {
    const title = workspaceName(state, workspace)
    const needsInput = chatWaits(state) || undefined
    return [
      {
        key: 'session',
        kind: 'session',
        title,
        selected: true,
        running,
        needsInput,
      },
    ]
  }
  const [first, second] = workspaceSessions
  const linked =
    state.tab === 'linked-session' || state.composer === 'no-starter-login'
  const sent = sessionLinkStates(state)
  let firstPath: string = linked ? paths.noStarterLogin : paths.app
  if (state.composer === 'not-shared') firstPath = paths.loginNotShared
  if (state.composer === 'no-starter-login' && state.login === 'org') {
    firstPath = paths.orgLoginRemoved
  }
  if (sent) firstPath = paths.sentBy
  const tabs: WorkspaceTab[] = [
    {
      key: first.key,
      kind: 'session',
      title: nameLabel(first.title),
      to: firstPath,
      selected: state.tab === 'session' || state.tab === 'preview-behind',
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
      to: state.tab === 'code-lines' ? paths.codeAtLine : paths.code,
      selected: state.tab === 'code' || state.tab === 'code-lines',
    },
  ]
  // A repository change closes the file tabs of the old repository.
  if (state.repositoryMove === 'changed') tabs.pop()
  if (state.tabRow === 'full') tabs.push(...moreTabs)
  if (state.tab === 'markdown') {
    const to = readmeBesideKeptSkill(state) ?? paths.markdown
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
      hidesPath: masked,
    })
  }
  const picture = pictureTab(state)
  if (picture) tabs.push(picture)
  const html = htmlTab(state)
  if (html) tabs.push(html)
  const skill = skillTab(state)
  if (skill) tabs.push(skill)
  tabs.push(...previewTabs(state))
  if (state.tab === 'unnamed-file') {
    tabs.push({
      key: 'unnamed',
      kind: 'code',
      title: 'File',
      to: paths.maskedPathsUnnamed,
      selected: true,
      hidesPath: true,
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
  if (state.tab === 'started-session') {
    const { key, title } = startedSession
    tabs.push({
      key,
      kind: 'session',
      title: nameLabel(title),
      to: paths.orgLoginStartedSession,
      selected: true,
    })
  }
  // The session of the open chat, and the session whose agent works. The
  // chat of a shown explanation belongs to its own tab, after these.
  const chat =
    state.tab === 'explanation'
      ? undefined
      : (tabs.find(
          (tab) =>
            tab.kind === 'session' &&
            tab.selected &&
            tab.key !== newSession.key,
        ) ?? tabs[0])
  const background = state.conversation === 'session-links'
  const active = background ? tabs[0] : chat
  const states = tabs.map((tab) => ({
    ...tab,
    running: tab === active && (running || background),
    needsInput:
      (tab.kind === 'session' && tabNeedsInput(state, tab.key, tab === chat)) ||
      undefined,
  }))
  const row = state.tabRow === 'moved' ? withCodeMoved(states) : states
  const all = withTemporaryTab(state, [...row, ...explainTabs(state)])
  return tabLinks(state, view, all)
}
