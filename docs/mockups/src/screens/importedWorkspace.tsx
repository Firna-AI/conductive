import type { ReactNode } from 'react'
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
import { oldSessions, openOldSession } from '../fixtures/conductorImport'
import { openableWorkspaceRecords } from '../fixtures/openableWorkspaces'
import { startErrors } from '../fixtures/starting'
import { importedScreensOf } from './importedScreens'
import type { WorkspaceState } from './workspaceState'

/** The workspace came from an import of Conductor. */
export function isImported(state: WorkspaceState): boolean {
  return openableWorkspaceRecords[state.workspace].from === 'conductor'
}

/**
 * The workspace came from Conductor, and no activation of it succeeded:
 * before its activation, or after a failed one.
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
 * composer, and the old sessions stay links. Activate and Try again open
 * the activation of the state, and stay static where none is drawn.
 */
export function importedChat(state: WorkspaceState): ImportedChat {
  const empty = (
    <OldSessionLinks links={oldSessionLinks(state)} sessions={oldSessions} />
  )
  const { activation } = importedScreensOf(state)
  switch (state.sandbox) {
    case 'inactive':
      return { empty, replaceComposer: <ActivateBar to={activation} /> }
    case 'error':
      return {
        empty,
        notice: (
          <ActivationFailedNotice
            message={startErrors[state.startError]}
            to={activation}
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
 * What the files and tools panels of an imported workspace show before a
 * successful activation: before the activation, after a failed one, and
 * after an archive before the activation. Otherwise the panels show what
 * they show in any workspace. Their action opens the activation of the
 * state, as the chat does.
 */
export function importedPanel(
  state: WorkspaceState,
  phone: boolean,
): ReactNode | undefined {
  if (!isImported(state)) return undefined
  const to = importedScreensOf(state).activation
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
