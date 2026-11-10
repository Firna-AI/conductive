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
}

/**
 * Every state of the cloud computer of an imported workspace, with its
 * screens. The record names each state, with no fallback, so a new state
 * fails the typecheck until it names its screens. No imported entry draws
 * a refused start, an archive after the activation, or the menu of the
 * owner. Only the list after the import, with both workspaces Not active,
 * matches a state: the state before the activation.
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
    list: paths.importedList,
    owner: null,
    activation: paths.importedActivating,
    afterArchive: paths.importedArchived,
  },
  starting: { ...noScreens, chat: paths.importedActivating },
  error: {
    ...noScreens,
    chat: paths.importedFailed,
    document: paths.importedOldSessionFailed,
    files: paths.importedFailedFiles,
    activation: paths.importedActivating,
    afterArchive: paths.importedArchived,
  },
  ready: {
    ...noScreens,
    chat: paths.importedReady,
    document: paths.importedOldSessionActive,
    files: paths.importedReadyFiles,
    terminal: paths.importedReadyTerminal,
    preview: paths.importedReadyPreview,
    history: paths.importedHistory,
  },
  stopped: {
    ...noScreens,
    chat: paths.importedStopped,
    document: paths.importedOldSessionStopped,
    files: paths.importedStoppedFiles,
    terminal: paths.importedStoppedTerminal,
  },
  refused: noScreens,
  archived: noScreens,
  'archived-inactive': {
    ...noScreens,
    chat: paths.importedArchived,
    document: paths.importedArchivedOldSession,
  },
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
  return drawn ? importedScreens[state.sandbox] : noScreens
}
