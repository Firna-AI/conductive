import { useCallback, useMemo, useSyncExternalStore } from 'react'
import type { BarAction } from '../../docs/mockups/src/components/workspace/barModel'
import { useWorkspaceStore } from '../app/workspace-store'
import { BarActions, type BarActionsPorts } from './barActions'
import { promptOf } from './barPrompts'
import { barViewOf, type BarControls, type LocalWork } from './barView'
import type { WorkspaceTarget } from './githubClient'
import type { GitHubFeed } from './githubStore'

function connectBar(actions: BarActions): () => void {
  return actions.connect()
}

/**
 * The one action store of the bar of a workspace, for the desktop bar and
 * the top of the phone Checks tab. Keep `ports` stable: a new function, a
 * new workspace, or a new member makes a new store, so no access, run, or
 * outcome of another one stays.
 */
export function useBarActions(
  target: WorkspaceTarget,
  ports: (target: WorkspaceTarget) => BarActionsPorts,
): BarActions {
  const create = useCallback(
    (workspace: WorkspaceTarget) => new BarActions(ports(workspace)),
    [ports],
  )
  return useWorkspaceStore(target, { create, connect: connectBar }).store
}

/** What the bar actions read beside the GitHub state and their store. */
export interface BarScreen {
  /** The GitHub state of the workspace branch. */
  github: GitHubFeed
  actions: BarActions
  localWork: LocalWork
  /** A turn runs in a session of the workspace. */
  turnRuns: boolean
  /** An archived workspace or a suspended org: only links show. */
  readOnly: boolean
  /** Opens the Archive question, or null when the member may not archive. */
  archive: (() => void) | null
  /**
   * Shows the chat when a prompt did not go out, so the reason shows: the
   * session whose composer names a missing login or a failed send, or the
   * chat without an open session. A sent prompt keeps the view.
   */
  showChat: () => void
}

/**
 * The view and the presses of the bar actions, or null while no GitHub
 * state shows. An agent action sends the prompt of the state that shows,
 * Merge merges its head, and Continue starts from the branch of the bar.
 */
export function useBarControls(screen: BarScreen): BarControls | null {
  const { github, actions, localWork, turnRuns, readOnly } = screen
  const { archive, showChat } = screen
  const shown = useSyncExternalStore(actions.subscribe, actions.getSnapshot)
  const { state } = github
  return useMemo(() => {
    if (state.status !== 'ready') return null
    const { snapshot } = state
    const onAction = (action: BarAction) => {
      switch (action.kind) {
        case 'agent':
          void actions
            .sendPrompt(promptOf(action.action, snapshot))
            .then((result) => {
              if (result !== null && result !== 'sent') showChat()
            })
          return
        case 'merge':
          void actions.merge(snapshot)
          return
        case 'continue':
          void actions.continueWorkspace()
          return
        case 'archive':
          archive?.()
          return
      }
    }
    const view = barViewOf({
      snapshot,
      capabilities: shown.capabilities,
      localWork,
      outcome: shown.outcome,
      turnRuns,
      readOnly,
      archivable: archive !== null,
    })
    return { view, onAction }
  }, [state, shown, localWork, turnRuns, readOnly, archive, actions, showChat])
}
