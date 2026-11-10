import type { ReactNode } from 'react'
import { nameLabel } from '../../../../src/shared/name-label'
import {
  ArchivedImportBar,
  ArchivedImportPanel,
} from '../components/conductor-import/ArchivedImport'
import {
  ActivateBar,
  ActivationFailedNotice,
  ImportedPanel,
  OldSessionLinks,
} from '../components/conductor-import/ImportedParts'
import type { WorkspaceTab } from '../components/workspace/TabItem'
import { oldSessions, openOldSession } from '../fixtures/conductorImport'
import { openableWorkspaceRecords } from '../fixtures/openableWorkspaces'
import { newSession } from '../fixtures/sessions'
import { startErrors } from '../fixtures/starting'
import { paths } from '../paths'
import type { WorkspaceState } from './workspaceState'

/** The workspace came from an import of Conductor. */
export function isImported(state: WorkspaceState): boolean {
  return openableWorkspaceRecords[state.workspace].from === 'conductor'
}

/**
 * The workspace came from Conductor and was never activated: before its
 * activation, or after a failed one. It has no cloud computer.
 */
export function neverActivated(state: WorkspaceState): boolean {
  return (
    isImported(state) &&
    (state.sandbox === 'inactive' || state.sandbox === 'error')
  )
}

/**
 * Whether the workspace has file lists. A workspace from Conductor has them
 * only from the end of its activation, which copies its work in.
 */
export function hasFileLists(state: WorkspaceState): boolean {
  if (!isImported(state)) return true
  return state.sandbox === 'ready' || state.sandbox === 'stopped'
}

/** The screen of the chat of an imported workspace in each state. */
export function importedChatPath(state: WorkspaceState): string {
  switch (state.sandbox) {
    case 'inactive':
      return paths.imported
    case 'starting':
      return paths.importedActivating
    case 'error':
      return paths.importedFailed
    case 'stopped':
      return paths.importedStopped
    case 'archived-inactive':
      return paths.importedArchived
    default:
      return paths.importedReady
  }
}

/**
 * The screens that the controls of an imported workspace open in its
 * state, where the mockups draw one: its chat, the Files, Terminal, and
 * Preview tabs, and the session history. A control without a screen stays
 * static, so no control opens another workspace or another state.
 */
export type ImportedLinks = Readonly<{
  chat: string
  files?: string
  terminal?: string
  preview?: string
  history?: string
}>

export function importedLinks(state: WorkspaceState): ImportedLinks {
  const chat = importedChatPath(state)
  switch (state.sandbox) {
    case 'inactive':
      return {
        chat,
        files: paths.importedFiles,
        terminal: paths.importedTerminal,
        preview: paths.importedPreview,
      }
    case 'error':
      return { chat, files: paths.importedFailedFiles }
    case 'ready':
      return {
        chat,
        files: paths.importedReadyFiles,
        terminal: paths.importedReadyTerminal,
        preview: paths.importedReadyPreview,
        history: paths.importedHistory,
      }
    case 'stopped':
      return {
        chat,
        files: paths.importedStoppedFiles,
        terminal: paths.importedStoppedTerminal,
      }
    default:
      return { chat }
  }
}

/**
 * The screen of the Markdown of the old session in the state of the
 * workspace: before the activation, after it, or while the cloud computer
 * is stopped. Other states have no such screen.
 */
function oldSessionPath(state: WorkspaceState): string | undefined {
  switch (state.sandbox) {
    case 'inactive':
      return paths.importedOldSession
    case 'ready':
      return paths.importedOldSessionActive
    case 'stopped':
      return paths.importedOldSessionStopped
    case 'archived-inactive':
      return paths.importedArchivedOldSession
    default:
      return undefined
  }
}

/**
 * The screen that each link to an old session opens, in the state of the
 * workspace, where the mockups draw it: the links in place of the empty
 * chat, and the rows of the session history.
 */
export function oldSessionLinks(
  state: WorkspaceState,
): Readonly<Record<string, string>> {
  const to = oldSessionPath(state)
  return to === undefined ? {} : { [openOldSession.key]: to }
}

/**
 * The tabs of an imported workspace. Before its activation it has no
 * session, so only the Markdown of an old session opens a tab. From its
 * activation on, the composer starts a new session, which shows Untitled
 * until its first message.
 */
export function importedTabs(state: WorkspaceState): WorkspaceTab[] {
  const old = state.tab === 'old-session'
  const tabs: WorkspaceTab[] = []
  // Before an activation, and after an archive before it, nothing starts a
  // session.
  if (state.sandbox !== 'inactive' && state.sandbox !== 'archived-inactive') {
    tabs.push({
      key: newSession.key,
      kind: 'session',
      title: nameLabel(newSession.title),
      to: importedChatPath(state),
      selected: !old,
    })
  }
  if (old) {
    tabs.push({
      key: 'old-session',
      kind: 'markdown',
      title: openOldSession.title,
      to: oldSessionPath(state),
      selected: true,
    })
  }
  return tabs
}

/** What the chat of an imported workspace shows around its composer. */
export type ImportedChat = {
  /** The links to the old sessions, in place of an empty chat. */
  empty: ReactNode
  /** The Activate question, in place of the composer. */
  replaceComposer?: ReactNode
  /** A failed activation, above the composer, which stays. */
  notice?: ReactNode
}

/**
 * The chat of an imported workspace. Before its activation the Activate
 * question takes the place of the composer. During the activation, as in
 * every first start, the composer queues messages. A failed activation
 * keeps the composer under its notice, as a failed first start does. After
 * an archive before the activation, its bar takes the place of the
 * composer, and the old sessions stay links.
 */
export function importedChat(state: WorkspaceState): ImportedChat {
  const empty = (
    <OldSessionLinks links={oldSessionLinks(state)} sessions={oldSessions} />
  )
  switch (state.sandbox) {
    case 'inactive':
      return {
        empty,
        replaceComposer: <ActivateBar to={paths.importedActivating} />,
      }
    case 'error':
      return {
        empty,
        notice: (
          <ActivationFailedNotice
            message={startErrors[state.startError]}
            to={paths.importedActivating}
          />
        ),
      }
    case 'archived-inactive':
      return { empty, replaceComposer: <ArchivedImportBar /> }
    default:
      return { empty }
  }
}

/**
 * What the files and tools panels of an imported workspace show while it
 * has no cloud computer: before the activation, after a failed one, and
 * after an archive before the activation. Otherwise the panels show what
 * they show in any workspace.
 */
export function importedPanel(
  state: WorkspaceState,
  phone: boolean,
): ReactNode | undefined {
  if (!isImported(state)) return undefined
  const to = paths.importedActivating
  switch (state.sandbox) {
    case 'inactive':
      return <ImportedPanel phone={phone} state="inactive" to={to} />
    case 'error':
      return <ImportedPanel phone={phone} state="failed" to={to} />
    case 'archived-inactive':
      return <ArchivedImportPanel />
    default:
      return undefined
  }
}
