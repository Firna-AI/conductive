import { useCallback } from 'react'
import { useWorkspaceStore } from '../app/workspace-store'
import { TERMINAL_LIMIT } from '../shared/terminal'
import type { TerminalReadiness } from './terminalReadiness'
import type { TerminalRoute } from './terminalRoute'
import { createTerminalStore, type TerminalStore } from './terminalStore'
import type { ToolWorkspace } from './tool-parts/workspace'
import { useTerminalActions, type TerminalActions } from './useTerminalActions'

/**
 * The terminals of one workspace, as the Terminal tool shows them: the
 * state of the tool, its own actions, and the writes of the tabs.
 */
export interface Terminals {
  /** What the tool shows: a wait, an error, or the ready terminals. */
  view: TerminalReadiness['view']
  /** The tool's own actions on its state, such as Try again or Reconnect. */
  dispatch: TerminalStore['dispatch']
  /** The + and the close of the tabs. */
  actions: TerminalActions
  /**
   * The + takes a press: the tabs show, the workspace has fewer terminals
   * than the limit, and no open runs.
   */
  canOpen: boolean
}

/**
 * The terminals of one workspace: the store of the Terminal tool, with its
 * read of the terminal state and its events, and the writes of the tabs.
 * `TerminalTool` calls it while it is mounted. An owner that runs the +
 * from outside the tool, such as for New terminal of the command palette,
 * calls it while the sandbox runs, also before the tool shows, and gives
 * the result to `TerminalToolView`. Keep `workspace.fetch` and
 * `workspace.subscribe` stable, and keep the route stable while it names
 * the same terminals.
 */
export function useTerminals(
  workspace: ToolWorkspace,
  route: TerminalRoute,
): Terminals {
  const { fetch, subscribe } = workspace
  const connect = useCallback(
    (store: TerminalStore) => store.connect({ fetch, subscribe }),
    [fetch, subscribe],
  )
  const { store, snapshot } = useWorkspaceStore(workspace, {
    create: createTerminalStore,
    connect,
  })
  const { view } = snapshot
  const ready = view.state === 'ready' ? view : null
  const opening = ready?.opening ?? false
  const actions = useTerminalActions(workspace, route, opening, store.dispatch)
  const canOpen =
    ready !== null &&
    ready.several &&
    !opening &&
    ready.terminals.length < TERMINAL_LIMIT
  return { view, dispatch: store.dispatch, actions, canOpen }
}
