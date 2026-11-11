import { openableWorkspaceRecords } from '../fixtures/openableWorkspaces'
import type { StartError } from '../fixtures/starting'
import { paths } from '../paths'
import { importedWorkspace, type WorkspaceState } from './workspaceState'

/**
 * The screens of an imported workspace in one state of its cloud computer,
 * where the mockups draw them. Null marks a screen that no entry draws, so
 * its control stays static. A state whose chat lists the old sessions names
 * both its chat and the Markdown of an old session in that state, so each
 * document has a way back to the same state.
 */
type ImportedScreens = Readonly<
  {
    files: string | null
    terminal: string | null
    preview: string | null
    history: string | null
    /** The workspace list in the same state, which Back and the org open. */
    list: string | null
    /** The open menu of the owner, which the owner opens for an admin. */
    owner: string | null
    /** The activation, which Activate and Try again open. */
    activation: string | null
    /** The archived workspace, which Archive of its question opens. */
    afterArchive: string | null
    /**
     * What Archive of the selected row opens: the question of Archive before
     * a successful activation, or the archived workspace with its toast
     * after it, because Archive is then one action.
     */
    archive: string | null
    /** The workspace back in its section, which Restore opens. */
    restore: string | null
  } & (
    { chat: string; document: string } | { chat: string | null; document: null }
  )
>

/** No drawn screen: every control stays static. */
const noScreens: ImportedScreens = {
  chat: null,
  document: null,
  files: null,
  terminal: null,
  preview: null,
  history: null,
  list: null,
  owner: null,
  activation: null,
  afterArchive: null,
  archive: null,
  restore: null,
}

/** The session from Conductor that a chat shows, or that opened a document. */
type Origin = WorkspaceState['resume']

/**
 * The screens of the activated workspace, by the session that its chat
 * shows or that opened the document. The new session has the screens of
 * every tab. A session from Conductor names only its own chat, and the
 * one that resumed also its document, so a document opened from that
 * session returns to it, and no control leaves for the new session.
 */
const readyScreens: Readonly<Record<Origin, ImportedScreens>> = {
  none: {
    ...noScreens,
    chat: paths.importedReady,
    document: paths.importedOldSessionActive,
    files: paths.importedReadyFiles,
    terminal: paths.importedReadyTerminal,
    preview: paths.importedReadyPreview,
    history: paths.importedHistory,
    archive: paths.importedActivatedArchivedToast,
  },
  memory: {
    ...noScreens,
    chat: paths.importedResumed,
    document: paths.importedResumedDocument,
  },
  fallback: { ...noScreens, chat: paths.importedFallback },
}

/**
 * The screens of the activated workspace after its Archive, while the app
 * keeps its cloud computer. Its chat shows the session that resumed, and
 * Restore puts it back in its section, stopped.
 */
const archivedScreens: Readonly<Record<Origin, ImportedScreens>> = {
  none: noScreens,
  memory: {
    ...noScreens,
    chat: paths.importedActivatedArchived,
    document: paths.importedActivatedArchivedDocument,
    list: paths.importedActivatedArchivedGroup,
    restore: paths.importedStopped,
  },
  fallback: noScreens,
}

/**
 * The screens of a failed activation, by the message that the app saved.
 * The mockups draw a general failure and a package that does not fit the
 * disk. The disk example draws no document, no panel, and no Archive.
 */
const errorScreens: Readonly<Record<StartError, ImportedScreens>> = {
  failed: {
    ...noScreens,
    chat: paths.importedFailed,
    document: paths.importedOldSessionFailed,
    files: paths.importedFailedFiles,
    activation: paths.importedActivating,
    afterArchive: paths.importedArchivedToast,
    archive: paths.importedArchiveFailed,
  },
  'disk-space': {
    ...noScreens,
    chat: paths.importedDiskSpace,
    activation: paths.importedActivating,
  },
  'time-limit': noScreens,
  'branch-gone': noScreens,
}

/**
 * Every other state of the cloud computer, with its screens. No imported
 * entry draws a refused start or the menu of the owner. Only the list
 * after the import, with both workspaces Not active, matches a state: the
 * state before the activation.
 */
const sandboxScreens: Readonly<
  Record<
    Exclude<WorkspaceState['sandbox'], 'ready' | 'error' | 'archived'>,
    ImportedScreens
  >
> = {
  inactive: {
    chat: paths.imported,
    document: paths.importedOldSession,
    files: paths.importedFiles,
    terminal: paths.importedTerminal,
    preview: paths.importedPreview,
    history: null,
    list: paths.importedList,
    owner: null,
    activation: paths.importedActivating,
    afterArchive: paths.importedArchivedToast,
    archive: paths.importedArchive,
    restore: null,
  },
  starting: { ...noScreens, chat: paths.importedActivating },
  stopped: {
    ...noScreens,
    chat: paths.importedStopped,
    document: paths.importedOldSessionStopped,
    files: paths.importedStoppedFiles,
    terminal: paths.importedStoppedTerminal,
    archive: paths.importedActivatedArchivedToast,
  },
  refused: noScreens,
  'archived-inactive': {
    ...noScreens,
    chat: paths.importedArchived,
    document: paths.importedArchivedOldSession,
  },
}

/**
 * The session from Conductor of a state. Only the session tab and the
 * document tab come from one. Every other tab belongs to the new session.
 */
function originOf(state: WorkspaceState): Origin {
  const fromSession = state.tab === 'session' || state.tab === 'old-session'
  return fromSession ? state.resume : 'none'
}

/**
 * The screens of a state. The records name each state, with no fallback,
 * so a new state or a new saved message fails the typecheck until it
 * names its screens. A session from Conductor continues only in the
 * activated workspace, so another state with one has no drawn screen. An
 * archived workspace has the screens of an activated one only when its
 * record marks the activation, because an Archive alone does not.
 */
function screensOf(state: WorkspaceState): ImportedScreens {
  const origin = originOf(state)
  switch (state.sandbox) {
    case 'ready':
      return readyScreens[origin]
    case 'archived':
      return openableWorkspaceRecords[state.workspace].activated
        ? archivedScreens[origin]
        : noScreens
    case 'error':
      return origin === 'none' ? errorScreens[state.startError] : noScreens
    default:
      return origin === 'none' ? sandboxScreens[state.sandbox] : noScreens
  }
}

/**
 * The screens of an imported workspace in its state. Every imported entry
 * draws the viewer and the org of `app/imported`: an admin, while Acme is
 * active. Another viewer or org, such as a member in the serve controls,
 * has no drawn screen, so each control stays static and no link changes
 * the person or the org.
 */
export function importedScreensOf(state: WorkspaceState): ImportedScreens {
  const drawn =
    state.viewer === importedWorkspace.viewer &&
    state.org === importedWorkspace.org
  return drawn ? screensOf(state) : noScreens
}
