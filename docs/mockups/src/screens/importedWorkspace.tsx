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

/**
 * The screens of an imported workspace in one state of its cloud computer,
 * where the mockups draw them. Null marks a screen that no entry draws, so
 * its control stays static. A state whose chat lists the old sessions names
 * both its chat and the Markdown of an old session in that state, so each
 * document has a way back to the same state.
 */
export type ImportedScreens = Readonly<
  {
    files: string | null
    terminal: string | null
    preview: string | null
    history: string | null
  } & (
    { chat: string; document: string } | { chat: string | null; document: null }
  )
>

/**
 * Every state of the cloud computer of an imported workspace, with its
 * screens. The record names each state, with no fallback, so a new state
 * fails the typecheck until it names its screens. No imported entry draws
 * a refused start, or an archive after the activation.
 */
const importedScreens: Readonly<
  Record<WorkspaceState['sandbox'], ImportedScreens>
> = {
  inactive: {
    chat: paths.imported,
    document: paths.importedOldSession,
    files: paths.importedFiles,
    terminal: paths.importedTerminal,
    preview: paths.importedPreview,
    history: null,
  },
  starting: {
    chat: paths.importedActivating,
    document: null,
    files: null,
    terminal: null,
    preview: null,
    history: null,
  },
  error: {
    chat: paths.importedFailed,
    document: paths.importedOldSessionFailed,
    files: paths.importedFailedFiles,
    terminal: null,
    preview: null,
    history: null,
  },
  ready: {
    chat: paths.importedReady,
    document: paths.importedOldSessionActive,
    files: paths.importedReadyFiles,
    terminal: paths.importedReadyTerminal,
    preview: paths.importedReadyPreview,
    history: paths.importedHistory,
  },
  stopped: {
    chat: paths.importedStopped,
    document: paths.importedOldSessionStopped,
    files: paths.importedStoppedFiles,
    terminal: paths.importedStoppedTerminal,
    preview: null,
    history: null,
  },
  refused: {
    chat: null,
    document: null,
    files: null,
    terminal: null,
    preview: null,
    history: null,
  },
  archived: {
    chat: null,
    document: null,
    files: null,
    terminal: null,
    preview: null,
    history: null,
  },
  'archived-inactive': {
    chat: paths.importedArchived,
    document: paths.importedArchivedOldSession,
    files: null,
    terminal: null,
    preview: null,
    history: null,
  },
}

/** The screens of an imported workspace in its state. */
export function importedScreensOf(state: WorkspaceState): ImportedScreens {
  return importedScreens[state.sandbox]
}

/**
 * The screen that each link to an old session opens, in the state of the
 * workspace, where the mockups draw it: the links in place of the empty
 * chat, and the rows of the session history.
 */
export function oldSessionLinks(
  state: WorkspaceState,
): Readonly<Record<string, string>> {
  const { document } = importedScreensOf(state)
  return document === null ? {} : { [openOldSession.key]: document }
}

/**
 * The tabs of an imported workspace. Before its activation it has no
 * session, so only the Markdown of an old session opens a tab. From its
 * activation on, the composer starts a new session, which shows Untitled
 * until its first message.
 */
export function importedTabs(state: WorkspaceState): WorkspaceTab[] {
  const old = state.tab === 'old-session'
  const screens = importedScreensOf(state)
  const tabs: WorkspaceTab[] = []
  // Before an activation, and after an archive before it, nothing starts a
  // session.
  if (state.sandbox !== 'inactive' && state.sandbox !== 'archived-inactive') {
    tabs.push({
      key: newSession.key,
      kind: 'session',
      title: nameLabel(newSession.title),
      to: screens.chat ?? undefined,
      selected: !old,
    })
  }
  if (old) {
    tabs.push({
      key: 'old-session',
      kind: 'markdown',
      title: openOldSession.title,
      to: screens.document ?? undefined,
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
